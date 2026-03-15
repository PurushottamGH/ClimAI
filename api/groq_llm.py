"""
groq_llm.py — Groq LLM Answer Generator
Drop-in replacement for build_focused_analysis().
Reads all fetched data + ML results and generates a smart natural language answer.

Install: pip install groq
Get free API key: https://console.groq.com
"""

import json
import os
from groq import Groq

# ── Put your key here OR set env variable GROQ_API_KEY ──
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

client = Groq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """You are ClimAI, an expert disaster and weather intelligence assistant for Chennai, India.

You receive structured data fetched from real APIs (Open-Meteo, USGS, NOAA) and ML model predictions.
Your job is to answer the user's question clearly and conversationally using ONLY the data provided.

Rules:
- Be concise but informative (3-6 sentences max unless a detailed report is asked)
- Always mention the actual numbers from the data (temperatures, wind speed, etc.)
- If ML ensemble predictions are present, mention the confidence level
- If data is missing or has errors, say so honestly
- Never make up numbers — only use what's in the data
- Format nicely: use line breaks for readability
- Always mention the date/time period the data refers to
- For comparisons and multi-year ranges: if historical_comparison data is present, you MUST use it.
  Show a clear year-by-year breakdown with differences, or summarize the trend over the years.
  Identify the hottest/coldest years or highest precipitation if a range is provided.
  Never say historical data is unavailable if historical_comparison is in the provided data.
"""


def groq_answer(query: str, intents: list, data_sources: dict,
                target_date=None, date_type: str = "today") -> str:
    """
    Generate a natural language answer using Groq LLM.
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

    # Single historical weather (non-comparison)
    if "historical_weather" in data_sources and data_sources["historical_weather"]:
        hw = data_sources["historical_weather"]
        if isinstance(hw, dict) and "daily" in hw:
            data_summary["historical_weather"] = {
                "date_range": hw.get("period", hw.get("queried_date", "")),
                "days": hw["daily"][:5] if hw["daily"] else []
            }
        else:
            data_summary["historical_weather"] = hw

    # ── NEW: Multi-year comparison data ──────────────────────────────────────
    # If executor fetched historical data for multiple past years, include ALL
    # of it so Groq can do a proper side-by-side comparison.
    if "historical_comparison" in data_sources and data_sources["historical_comparison"]:
        comparison_list = data_sources["historical_comparison"]
        comparison_summary = []
        for entry in comparison_list:
            if isinstance(entry, dict) and "daily" in entry:
                comparison_summary.append({
                    "year":         entry.get("queried_year"),
                    "date":         entry.get("queried_date"),
                    "daily":        entry["daily"][:3],   # first 3 days is enough
                    "source":       entry.get("source", "Open-Meteo Archive API"),
                })
            else:
                comparison_summary.append(entry)
        data_summary["historical_comparison"] = comparison_summary
    # ─────────────────────────────────────────────────────────────────────────

    # Earthquake
    if "earthquake" in data_sources and data_sources["earthquake"]:
        eq = data_sources["earthquake"]
        data_summary["earthquakes"] = eq[:5] if isinstance(eq, list) else eq

    # Cyclone
    if "cyclone" in data_sources and data_sources["cyclone"]:
        data_summary["cyclone"] = data_sources["cyclone"]

    # Tsunami
    if "tsunami" in data_sources and data_sources["tsunami"]:
        data_summary["tsunami"] = data_sources["tsunami"]

    # ML Ensemble predictions
    if "ensemble" in data_sources and data_sources["ensemble"]:
        ens = data_sources["ensemble"]
        report = ens.get("final_report", {})
        preds = report.get("predictions", [])
        data_summary["ml_predictions"] = {
            "models_used":        ens.get("models_used", []),
            "overall_confidence": report.get("overall_confidence", "unknown"),
            "agreement_score":    report.get("agreement_score"),
            "next_7_days":        preds[:7],
        }

    # Forecast
    if "forecast" in data_sources and data_sources["forecast"]:
        fc = data_sources["forecast"]
        if isinstance(fc, dict) and "daily" in fc:
            data_summary["forecast"] = fc["daily"][:7]

    date_str = target_date.strftime("%B %d, %Y") if target_date else "today"

    # Build a comparison-aware instruction hint for the prompt
    comparison_hint = ""
    if "historical_comparison" in data_summary:
        years = [str(e.get("year", "?")) for e in data_summary["historical_comparison"]]
        comparison_hint = (
            f"\n\nIMPORTANT: The user wants a comparison. "
            f"You have historical data for: {', '.join(years)}. "
            f"You also have current_weather for today (2026). "
            f"Compare them directly — show specific numbers and calculate the differences."
        )

    user_prompt = f"""User question: "{query}"

Detected intents: {', '.join(intents)}
Date context: {date_str} ({date_type})
Location: Chennai, India

Available data:
{json.dumps(data_summary, indent=2, default=str)}{comparison_hint}

Please answer the user's question based on this data."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        return f"[Groq unavailable: {e}] Data was fetched successfully — check the 'data' field in the response."