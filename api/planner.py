from date_utils import parse_date
import re
import json
import logging
from groq_llm import client as groq_client # Reuse the existing Groq client

KNOWN_CYCLONES = ["michaung", "mandous", "nivar", "gaja", "vardah", "thane", "nisha",
                  "fani", "amphan", "hudhud", "phailin", "laila", "jal"]

KNOWN_LOCATIONS = ["chennai", "mumbai", "kolkata", "vizag", "visakhapatnam",
                   "bay of bengal", "arabian sea", "tamil nadu", "andhra pradesh",
                   "odisha", "west bengal", "india", "puducherry", "cuddalore",
                   "nagapattinam", "mahabalipuram"]

def _normalize_query(q: str) -> str:
    """
    Normalize common typos and misspellings that affect intent detection.
    Handles fuzzy variants of keywords like 'previous', 'historical', etc.
    """
    typo_map = {
        # previous variants
        r"\bpervious\b": "previous",
        r"\bprevios\b": "previous",
        r"\bpreviuos\b": "previous",
        r"\bprevioues\b": "previous",
        r"\bprevius\b": "previous",
        r"\bprevioius\b": "previous",
        # historical variants
        r"\bhistorical\b": "historical",
        r"\bhistorcal\b": "historical",
        r"\bhistoricle\b": "historical",
        # yesterday variants
        r"\byesterady\b": "yesterday",
        r"\byestarday\b": "yesterday",
    }
    for pattern, replacement in typo_map.items():
        q = re.sub(pattern, replacement, q)
    return q


def classify_query(query: str):
    """
    Classify query into granular intent categories.
    """
    q = _normalize_query(query.lower().strip())
    intents = []

    # Detect time orientation
    past_kw = ["last year", "previous", "history", "historical", "ago", "past",
               "same date", "same day", "this day", "yesterday", "back in",
               "was", "were", "happened", "occurred", "hit", "struck", "recent"]
    future_kw = ["predict", "prediction", "next", "forecast", "tomorrow",
                 "coming", "upcoming", "expect", "will", "probability",
                 "chance", "future", "model", "ml", "ai"]

    is_past = any(re.search(rf"\b{k}\b", q) for k in past_kw)
    is_future = any(re.search(rf"\b{k}\b", q) for k in future_kw)

    # Force historical mode if an explicit past year is mentioned (e.g. "2025", "2023")
    current_year = __import__("datetime").datetime.now().year
    past_year_match = re.search(r'\b(19\d{2}|20\d{2})\b', q)
    if past_year_match and int(past_year_match.group(1)) < current_year:
        is_past = True
        is_future = False

    weather_kw = ["weather", "temperature", "temp", "hot", "cold", "rain", "wind", "humidity",
                  "climate", "heat", "sunny", "cloudy", "precipitation", "pressure",
                  "detail", "condition", "report"]
    if any(re.search(rf"\b{k}\b", q) for k in weather_kw):
        if is_past: intents.append("weather_history")
        elif is_future: intents.append("prediction")
        else: intents.append("weather")

    cyclone_kw = ["cyclone", "hurricane", "typhoon", "storm", "wind storm", "tropical",
                  "bay of bengal", "vardah", "nivar", "gaja", "mandous", "michaung",
                  "thane", "nisha", "fani", "amphan", "hudhud"]
    if any(re.search(rf"\b{k}\b", q) for k in cyclone_kw):
        if is_future: intents.append("cyclone_prediction")
        else: intents.append("cyclone")

    quake_kw = ["earthquake", "quake", "seismic", "magnitude", "richter", "tremor",
                "tectonic", "fault", "aftershock", "usgs"]
    if any(re.search(rf"\b{k}\b", q) for k in quake_kw):
        intents.append("earthquake")

    tsunami_kw = ["tsunami", "tidal wave", "ocean wave", "indian ocean", "sumatra",
                  "krakatoa", "sulawesi", "wave height"]
    if any(re.search(rf"\b{k}\b", q) for k in tsunami_kw):
        intents.append("tsunami")

    if not intents and is_future:
        intents.append("prediction")

    disaster_kw = ["disaster", "catastrophe", "calamity", "danger", "risk",
                   "overview", "summary", "all"]
    if any(re.search(rf"\b{k}\b", q) for k in disaster_kw):
        intents.append("disaster")

    if "compare" in q or "difference" in q or re.search(r"\bvs\b", q) or "versus" in q:
        intents.append("weather_comparison")

    # Detect year ranges (e.g., "2021 to 2026") and treat them as comparisons
    is_range = bool(re.search(r'\b(19\d{2}|20\d{2})\s*(?:to|-|and)\s*(19\d{2}|20\d{2})\b', q))
    if is_range and "weather_comparison" not in intents:
        intents.append("weather_comparison")

    if not intents:
        intents.append("weather")

    return list(set(intents))


def extract_query_context(query: str):
    """
    Extract structured context from a natural-language query.
    Used as fallback if LLM extraction fails.
    """
    q = _normalize_query(query.lower().strip())
    
    cyclone_name = None
    for name in KNOWN_CYCLONES:
        if name in q:
            cyclone_name = name
            break
            
    year = None
    m = re.search(r'(?<!\d)(?<!\d[-/])(19\d{2}|20\d{2})(?![-/]\d)(?!\d)', q)
    if m: year = int(m.group(1))
            
    location = None
    for loc in KNOWN_LOCATIONS:
        if loc in q:
            location = loc
            break
            
    wants_recent = any(k in q for k in ["recent", "latest", "last", "newest", "most recent"])
    wants_comparison = any(k in q for k in ["compare", "vs", "versus", "difference", "than"])

    # Detect year ranges
    is_range = bool(re.search(r'\b(19\d{2}|20\d{2})\s*(?:to|-|and)\s*(19\d{2}|20\d{2})\b', q))
    if is_range:
        wants_comparison = True

    return {
        "cyclone_name": cyclone_name,
        "year": year,
        "location": location,
        "wants_recent": wants_recent,
        "wants_comparison": wants_comparison
    }

def extract_intent_with_llm(query: str) -> dict:
    """
    Uses LLM to extract intents and context, fixing typos automatically.
    """
    system_prompt = """You are an intent classifier for a climate and disaster tracking app.
    Given a user query, you must extract their intent and basic context.
    The query may contain severe severe typos or bad grammar. You must figure out what they mean.
    
    Allowed intents: weather, weather_history, weather_comparison, prediction, cyclone, cyclone_history, cyclone_prediction, earthquake, tsunami, disaster.
    
    Output exactly valid JSON in this format:
    {
        "intents": ["list", "of", "intents"],
        "context": {
            "cyclone_name": null, // string if mentioned
            "year": null, // int if mentioned
            "location": null, // string if mentioned
            "wants_recent": false, // boolean
            "wants_comparison": false // boolean
        }
    }
    """
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Query: {query}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=200
        )
        result = json.loads(response.choices[0].message.content)
        # Ensure it has the expected structure
        if "intents" not in result or "context" not in result:
             raise ValueError("LLM returned malformed JSON structure")
        return result
    except Exception as e:
        import traceback
        logging.error(f"LLM extraction failed: {e}. Traceback: {traceback.format_exc()}")
        return None

def plan_query(query: str):
    """
    Create a deterministic execution plan, using LLM for typo-tolerant intent extraction.
    Falls back to regex parsing if the LLM fails.
    """
    # 1. Try LLM Extraction First
    llm_result = extract_intent_with_llm(query)
    
    if llm_result:
        intents = llm_result.get("intents", [])
        context = llm_result.get("context", {})
        # Safety fallback if LLM returns empty intents despite succeeding
        if not intents:
             intents = classify_query(query)
    else:
        # 2. Fallback to Regex
        logging.warning("Falling back to regex intent classification")
        intents = classify_query(query)
        context = extract_query_context(query)
        
    date_val = parse_date(query)
    
    # 3. Select the primary intent
    # Prioritize comparison or historical/cyclone if detected
    primary_intent = "weather"
    if "weather_comparison" in intents:
        primary_intent = "weather_comparison"
    elif "cyclone" in intents or "cyclone_history" in intents:
        primary_intent = "cyclone_history"
    elif "weather_history" in intents:
        primary_intent = "weather_history"
    else:
        primary_intent = intents[0] if intents else "unknown"

    return {
        "intent": primary_intent,
        "all_intents": intents,
        "date": date_val,
        "query": query,
        "context": context
    }
