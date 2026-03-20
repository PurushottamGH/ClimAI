from datetime import datetime

def review(query: str, plan: dict, raw_data: dict):
    """
    Critic Module: Detects mistakes and automatically corrects or flags them.
    Checks date parsing logic, data retrieval status, and ML model health.
    """
    corrections = []
    
    # 1. Date Misinterpretation Check
    # If the parser defaulted to Jan 1st but the user explicitly asked for another month
    if plan.get("date") and plan["date"].month == 1 and plan["date"].day == 1:
        months = ["feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        q_lower = query.lower()
        if any(m in q_lower for m in months):
            corrections.append("date_reparsed_from_jan1_default")
            # In a full self-healing loop, we would re-trigger the planner here
            # with explicit hints. For now, we flag the correction.
            
    # 2. Data Missing Check
    if not raw_data:
        corrections.append("data_missing")
    elif isinstance(raw_data, dict):
        # 3. ML Model Failure Check (if ML data exists)
        model_data = raw_data.get("models", {})
        if model_data:
            for m_name, m_res in model_data.items():
                if m_res.get("status") == "error":
                    corrections.append(f"fallback_triggered_for_{m_name}")
                    
        # 4. Empty Open-Meteo Arrays Check
        weather_data = raw_data.get("weather", {})
        if weather_data and "daily" in weather_data:
            if not weather_data["daily"].get("time"):
                corrections.append("open_meteo_returned_empty_arrays")
                
    return {
        "corrections": corrections,
        "data": raw_data,
        "is_valid": "data_missing" not in corrections
    }
