"""
groq_llm.py — ClimAI Groq LLM Answer Generator (v2 — Data-Grounded)
=====================================================================
Upgraded to load real historical context from data/llm_context.json
so the LLM answers are grounded in 5 years of actual Chennai data
instead of relying on generic training knowledge.

Install: pip install groq
Get free API key: https://console.groq.com
"""

import json
import os
import logging
from datetime import datetime
from groq import Groq

logger = logging.getLogger("climai")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY)

# ════════════════════════════════════════════════════════════════
# HISTORICAL CONTEXT LOADER
# Reads data/llm_context.json built by build_dataset.py
# Falls back to hardcoded Chennai knowledge if file not found
# ════════════════════════════════════════════════════════════════

_context_cache: dict = {}
_context_loaded_at = None
_CONTEXT_TTL_HOURS = 6   # reload from disk every 6 hours


def _load_llm_context() -> dict:
    """Load and cache the master LLM context from disk."""
    global _context_cache, _context_loaded_at

    if _context_cache and _context_loaded_at:
        age_hours = (datetime.now() - _context_loaded_at).total_seconds() / 3600
        if age_hours < _CONTEXT_TTL_HOURS:
            return _context_cache

    context_path = "llm_context.json"
    if os.path.exists(context_path):
        try:
            with open(context_path) as f:
                _context_cache = json.load(f)
            _context_loaded_at = datetime.now()
            logger.info("[groq_llm] Loaded historical context from data/llm_context.json")
            return _context_cache
        except Exception as e:
            logger.warning(f"[groq_llm] Failed to load llm_context.json: {e}")

    # Hardcoded fallback — used until build_dataset.py has been run
    logger.info("[groq_llm] Using hardcoded Chennai context (run build_dataset.py for real data)")
    return {
        "location": "Chennai, India (13.08N, 80.27E)",
        "data_coverage": "hardcoded fallback",
        "weather_climate": {
            "avg_max_temp_c": 35.0,
            "avg_min_temp_c": 24.0,
            "hottest_recorded_c": 44.0,
            "coolest_recorded_c": 18.0,
            "avg_annual_rainfall_mm": 1400,
            "max_daily_rainfall_mm": 490,
            "avg_wind_kmh": 18,
            "max_wind_kmh": 140,
            "seasonal_patterns": {
                "monsoon":    "June-November (SW + NE monsoon combined)",
                "cyclone":    "October-December (peak Bay of Bengal season)",
                "heatwave":   "March-June (pre-monsoon heat)",
                "dry_season": "January-February",
            },
            "notable_events": [
                "2015 Chennai floods — 1000mm+ in November, worst in 100 years",
                "Cyclone Vardah (Dec 2016) — direct Chennai hit, 140km/h winds",
                "Cyclone Nivar (Nov 2020) — Very Severe, landfall near Puducherry",
                "Cyclone Michaung (Dec 2023) — record 240mm rainfall, severe flooding",
            ],
        },
        "seismic_risk": {
            "regional_context": "Chennai sits on Peninsular India craton — relatively stable but vulnerable to Bay of Bengal subduction zone events.",
            "major_historical": "2004 Indian Ocean earthquake (M9.1) triggered devastating tsunami affecting Chennai coast.",
        },
        "air_quality": {
            "drivers": "Traffic, construction, industrial activity (Manali refinery corridor), crop burning in neighbouring states.",
        },
        "flood_risk": {
            "thresholds_mm": {"extreme": 204.5, "very_high": 115.5, "high": 64.5, "moderate": 35.5},
            "vulnerable_areas": "Adyar, Cooum, Buckingham Canal floodplains; low-lying zones in Tambaram, Velachery.",
        },
    }


def _build_context_block() -> str:
    """Convert loaded context into a compact string for the system prompt."""
    ctx = _load_llm_context()
    wc  = ctx.get("weather_climate", {})
    sr  = ctx.get("seismic_risk", {})
    aq  = ctx.get("air_quality", {})
    fr  = ctx.get("flood_risk", {})
    sp  = wc.get("seasonal_patterns", {})
    ev  = wc.get("notable_events", [])
    coverage = ctx.get("data_coverage", "unknown")

    lines = [
        f"CHENNAI HISTORICAL DATA CONTEXT ({coverage}):",
        "",
        "CLIMATE:",
        f"  Avg max temp:     {wc.get('avg_max_temp_c')}C",
        f"  Avg min temp:     {wc.get('avg_min_temp_c')}C",
        f"  Hottest recorded: {wc.get('hottest_recorded_c')}C",
        f"  Coolest recorded: {wc.get('coolest_recorded_c')}C",
        f"  Annual rainfall:  ~{wc.get('avg_annual_rainfall_mm')}mm",
        f"  Max daily rain:   {wc.get('max_daily_rainfall_mm')}mm",
        f"  Avg wind:         {wc.get('avg_wind_kmh')} km/h | Max: {wc.get('max_wind_kmh')} km/h",
    ]

    if wc.get("heatwave_days_in_period"):
        lines.append(f"  Heatwave days (5yr): {wc['heatwave_days_in_period']}")
    if wc.get("heavy_rain_days_in_period"):
        lines.append(f"  Heavy rain days (5yr): {wc['heavy_rain_days_in_period']}")

    lines += [
        "",
        "SEASONS:",
        f"  Monsoon:    {sp.get('monsoon', 'June-Nov')}",
        f"  Cyclone:    {sp.get('cyclone', 'Oct-Dec')}",
        f"  Heatwave:   {sp.get('heatwave', 'Mar-Jun')}",
        f"  Dry season: {sp.get('dry_season', 'Jan-Feb')}",
        "",
        "NOTABLE HISTORICAL EVENTS:",
    ]
    for e in ev:
        lines.append(f"  * {e}")

    if sr:
        lines += [
            "",
            "SEISMIC:",
            f"  Total events (5yr): {sr.get('total_events_5yr', 'N/A')}",
            f"  Max magnitude: M{sr.get('max_magnitude', 'N/A')}",
            f"  M6+ count: {sr.get('m6_plus_count', 'N/A')}",
            f"  Context: {sr.get('regional_context', '')}",
        ]

    if aq.get("avg_pm25_ugm3"):
        lines += [
            "",
            "AIR QUALITY:",
            f"  Avg PM2.5: {aq.get('avg_pm25_ugm3')} ug/m3 | Max: {aq.get('max_pm25_ugm3')} ug/m3",
            f"  Avg AQI: {aq.get('avg_aqi')} | Max: {aq.get('max_aqi')}",
            f"  Drivers: {aq.get('drivers', '')}",
        ]

    if fr:
        lines += [
            "",
            "FLOOD RISK:",
            f"  Extreme days (5yr): {fr.get('extreme_days', 'N/A')}",
            f"  High risk days (5yr): {fr.get('high_risk_days', 'N/A')}",
            f"  Peak flood month: {fr.get('peak_flood_month', 'Oct-Nov')}",
            f"  Vulnerable areas: {fr.get('vulnerable_areas', '')}",
        ]

    return "\n".join(lines)


def _build_system_prompt() -> str:
    context_block = _build_context_block()
    return f"""You are ClimAI, an advanced climate and disaster intelligence assistant for Chennai, India. You are powered by real historical data collected from Open-Meteo, USGS, NOAA, and other APIs spanning 5+ years.

{context_block}

YOUR JOB:
Answer the user's question clearly and insightfully using ONLY the provided live data and the historical context above. You understand Chennai's climate deeply — use that knowledge to give accurate, specific, contextualised answers.

RULES:
- Be concise but highly informative (3-6 sentences unless a detailed report is asked).
- Always cite actual numbers from the live data provided (temperatures, magnitudes, wind speeds, etc.).
- Reference historical context when relevant — e.g. "This is above Chennai's 5-year average of 35C".
- Highlight extreme events: if a value exceeds historical norms, flag it clearly.
- If ML ensemble predictions are present, state the AI confidence level and forecasted values. Mention how many days of real data the models were trained on.
- For multi-year comparisons: show a year-by-year breakdown with differences; identify extremes.
- If data is missing or has errors, say so honestly. Never invent numbers.
- Format with bullet points, bold text, and line breaks for readability.
- Always mention the date/time period the data refers to.
- Never say historical data is unavailable if historical_comparison is in the provided data.
"""


# ════════════════════════════════════════════════════════════════
# MAIN FUNCTION
# ════════════════════════════════════════════════════════════════

def groq_answer(query: str, intents: list, data_sources: dict,
                target_date=None, date_type: str = "today") -> str:
    """
    Generate a natural language answer using Groq LLM.
    The system prompt is dynamically built from real historical data,
    so the LLM is grounded in actual Chennai climate statistics.
    """
    data_summary = {}

    # Current weather
    if "weather" in data_sources and data_sources["weather"]:
        w = data_sources["weather"]
        data_summary["current_weather"] = {
            "temperature":    w.get("temperature"),
            "feels_like":     w.get("feels_like"),
            "humidity":       w.get("humidity"),
            "wind_speed":     w.get("wind_speed"),
            "wind_direction": w.get("wind_direction"),
            "precipitation":  w.get("precipitation"),
            "cloud_cover":    w.get("cloud_cover"),
        }

    # Single historical weather
    if "historical_weather" in data_sources and data_sources["historical_weather"]:
        hw = data_sources["historical_weather"]
        if isinstance(hw, dict) and "daily" in hw:
            data_summary["historical_weather"] = {
                "date_range": hw.get("period", hw.get("queried_date", "")),
                "days": hw["daily"][:5] if hw["daily"] else [],
            }
        else:
            data_summary["historical_weather"] = hw

    # Multi-year comparison
    if "historical_comparison" in data_sources and data_sources["historical_comparison"]:
        comparison_list = data_sources["historical_comparison"]
        comparison_summary = []
        for entry in comparison_list:
            if isinstance(entry, dict) and "daily" in entry:
                comparison_summary.append({
                    "year":   entry.get("queried_year"),
                    "date":   entry.get("queried_date"),
                    "daily":  entry["daily"][:3],
                    "source": entry.get("source", "Open-Meteo Archive API"),
                })
            else:
                comparison_summary.append(entry)
        data_summary["historical_comparison"] = comparison_summary

    # Earthquake
    if "earthquake" in data_sources and data_sources["earthquake"]:
        eq = data_sources["earthquake"]
        if isinstance(eq, dict):
            data_summary["earthquakes"] = {
                "summary":       eq.get("summary"),
                "recent_events": eq.get("events", [])[:10],
            }
        elif isinstance(eq, list):
            data_summary["earthquakes"] = eq[:10]
        else:
            data_summary["earthquakes"] = eq

    # Cyclone
    if "cyclone" in data_sources and data_sources["cyclone"]:
        cy = data_sources["cyclone"]
        if isinstance(cy, dict) and "cyclones" in cy:
            truncated = []
            for c in cy["cyclones"]:
                c_copy = c.copy()
                if "track" in c_copy:
                    c_copy["track"] = c_copy["track"][:5]
                truncated.append(c_copy)
            data_summary["cyclone"] = {"cyclones": truncated}
        else:
            data_summary["cyclone"] = cy

    # Tsunami
    if "tsunami" in data_sources and data_sources["tsunami"]:
        data_summary["tsunami"] = data_sources["tsunami"]

    # AQI
    if "aqi" in data_sources and data_sources["aqi"]:
        data_summary["aqi"] = data_sources["aqi"]

    # Flood risk
    if "flood_risk" in data_sources and data_sources["flood_risk"]:
        data_summary["flood_risk"] = data_sources["flood_risk"]

    # ML Ensemble predictions
    if "ensemble" in data_sources and data_sources["ensemble"]:
        ens    = data_sources["ensemble"]
        report = ens.get("final_report", {})
        preds  = report.get("predictions", [])
        data_summary["ml_predictions"] = {
            "models_used":        ens.get("models_used", []),
            "overall_confidence": report.get("overall_confidence", "unknown"),
            "agreement_score":    report.get("agreement_score"),
            "training_days":      ens.get("training_data", {}).get("days"),
            "next_7_days":        preds[:7],
        }

    # Forecast
    if "forecast" in data_sources and data_sources["forecast"]:
        fc = data_sources["forecast"]
        if isinstance(fc, dict) and "daily" in fc:
            data_summary["forecast"] = fc["daily"][:7]

    # Seasonal
    if "seasonal" in data_sources and data_sources["seasonal"]:
        data_summary["seasonal"] = data_sources["seasonal"]

    # Build user prompt
    date_str = target_date.strftime("%B %d, %Y") if target_date else "today"

    comparison_hint = ""
    if "historical_comparison" in data_summary:
        years = [str(e.get("year", "?")) for e in data_summary["historical_comparison"]]
        comparison_hint = (
            f"\n\nIMPORTANT: The user wants a comparison. "
            f"You have historical data for: {', '.join(years)}. "
            f"You also have current_weather for today (2026). "
            f"Compare them directly — show specific numbers and differences. "
            f"Reference the 5-year historical averages in your context where relevant."
        )

    prediction_hint = ""
    if "ml_predictions" in data_summary:
        td = data_summary["ml_predictions"].get("training_days")
        if td:
            prediction_hint = (
                f"\n\nML NOTE: Models were trained on {td} days of real Chennai historical data. "
                f"Reference the historical averages in your context to explain whether "
                f"the predictions are above or below normal for this time of year."
            )

    user_prompt = f"""User question: "{query}"

Detected intents: {', '.join(intents)}
Date context: {date_str} ({date_type})
Location: Chennai, India

Available live data:
{json.dumps(data_summary, indent=2, default=str)}{comparison_hint}{prediction_hint}

Please answer the user's question based on the live data above and your historical context knowledge."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens=700,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        return (
            f"[Groq unavailable: {e}] "
            f"Data was fetched successfully — check the 'data' field in the response."
        )