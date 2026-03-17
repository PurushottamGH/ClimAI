import requests
from datetime import datetime, timedelta
import math
import random

# Chennai coordinates
LAT = 13.0827
LON = 80.2707

def get_weather():
    """Current weather for Chennai."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,surface_pressure",
        "timezone": "Asia/Kolkata",
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        current = data.get("current", {})

        deg = current.get("wind_direction_10m", 0)
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                       "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        idx = round(deg / 22.5) % 16
        wind_dir = directions[idx]

        return {
            "temperature": current.get("temperature_2m"),
            "feels_like": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": wind_dir,
            "wind_direction_deg": deg,
            "wind_gusts": current.get("wind_gusts_10m"),
            "cloud_cover": current.get("cloud_cover"),
            "pressure": current.get("surface_pressure"),
            "precipitation": current.get("precipitation"),
            "rain": current.get("rain"),
        }
    except Exception as e:
        return {"error": str(e)}

def get_forecast():
    """7-day daily forecast for Chennai."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_probability_max,uv_index_max",
        "hourly": "temperature_2m,wind_speed_10m",
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})

        days = []
        times = daily.get("time", [])
        for i, date_str in enumerate(times):
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            days.append({
                "date": date_str,
                "day": dt.strftime("%a"),
                "temp_max": daily.get("temperature_2m_max", [None])[i] if i < len(daily.get("temperature_2m_max", [])) else None,
                "temp_min": daily.get("temperature_2m_min", [None])[i] if i < len(daily.get("temperature_2m_min", [])) else None,
                "precipitation": daily.get("precipitation_sum", [0])[i] if i < len(daily.get("precipitation_sum", [])) else 0,
                "wind_speed_max": daily.get("wind_speed_10m_max", [0])[i] if i < len(daily.get("wind_speed_10m_max", [])) else 0,
                "precip_prob": daily.get("precipitation_probability_max", [0])[i] if i < len(daily.get("precipitation_probability_max", [])) else 0,
                "uv_index": daily.get("uv_index_max", [0])[i] if i < len(daily.get("uv_index_max", [])) else 0,
            })

        hourly_data = []
        h_times = hourly.get("time", [])
        h_temps = hourly.get("temperature_2m", [])
        h_winds = hourly.get("wind_speed_10m", [])
        for i, t in enumerate(h_times):
            hourly_data.append({
                "time": t,
                "temperature": h_temps[i] if i < len(h_temps) else None,
                "wind_speed": h_winds[i] if i < len(h_winds) else None,
            })

        return {"daily": days, "hourly": hourly_data}
    except Exception as e:
        return {"error": str(e)}

def fetch_historical_weather(target_date: datetime, days_range: int = 1):
    """Fetch actual historical weather data from Open-Meteo Archive API."""
    start = target_date
    end = target_date + timedelta(days=days_range - 1)
    archive_limit = datetime.now() - timedelta(days=5)
    if end.date() > archive_limit.date():
        return {"error": f"Archive data not yet available for {end.strftime('%Y-%m-%d')}. Data lags 5-7 days."}

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": LAT, "longitude": LON,
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant",
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation",
        "timezone": "Asia/Kolkata",
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})
        days_data = []
        for i, date_str in enumerate(daily.get("time", [])):
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            days_data.append({
                "date": date_str,
                "day": dt.strftime("%A"),
                "temp_max": daily.get("temperature_2m_max", [None])[i],
                "temp_min": daily.get("temperature_2m_min", [None])[i],
                "precipitation": daily.get("precipitation_sum", [0])[i],
                "wind_speed_max": daily.get("wind_speed_10m_max", [0])[i],
            })
        return {"daily": days_data, "source": "Open-Meteo Archive API"}
    except Exception as e:
        return {"error": str(e)}

def get_earthquakes(min_magnitude: float = 4.5, days: int = 30):
    """Significant earthquakes from USGS."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)
    url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    params = {
        "format": "geojson",
        "starttime": start_time.isoformat(),
        "endtime": end_time.isoformat(),
        "minmagnitude": min_magnitude,
        "latitude": LAT,
        "longitude": LON,
        "maxradiuskm": 8000,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        features = data.get("features", [])
        events = []
        for f in features:
            props = f.get("properties", {})
            geom = f.get("geometry", {})
            coords = geom.get("coordinates", [0, 0, 0])
            events.append({
                "id": f.get("id"),
                "magnitude": props.get("mag"),
                "place": props.get("place"),
                "time": datetime.fromtimestamp(props.get("time") / 1000).isoformat(),
                "url": props.get("url"),
                "tsunami": props.get("tsunami"),
                "lat": coords[1],
                "lon": coords[0],
                "depth": coords[2]
            })
        return {
            "events": events,
            "summary": {
                "total": len(events),
                "max_magnitude": max((e["magnitude"] for e in events), default=0),
                "avg_depth": round(sum(e["depth"] for e in events) / len(events), 1) if events else 0,
                "tsunami_alerts": sum(1 for e in events if e["tsunami"]),
                "m6_plus": sum(1 for e in events if e["magnitude"] >= 6.0),
            }
        }
    except Exception as e:
        return {"error": str(e)}

def get_cyclones(year: int = None, name: str = None, min_wind: int = None):
    """Historical cyclone data for Bay of Bengal (simulated/expanded dataset)."""
    # ... (content from main.py)
    # I'll use a slightly more compact version to save space but keep logic same
    cyclones = [
        {"name": "Cyclone Michaung", "year": 2023, "category": "Severe", "max_wind_kmh": 110, "rainfall_mm": 240, "damage_crore": 1500, "dates": "Dec 2-6, 2023", "landfall": "Andhra Coast", "impact": "Heavy rain in Chennai, massive flooding"},
        {"name": "Cyclone Mandous", "year": 2022, "category": "Severe", "max_wind_kmh": 105, "rainfall_mm": 180, "damage_crore": 1000, "dates": "Dec 6-10, 2022", "landfall": "Near Mahabalipuram", "impact": "Trees uprooted, coastal flooding"},
        {"name": "Cyclone Nivar", "year": 2020, "category": "Very Severe", "max_wind_kmh": 145, "rainfall_mm": 250, "damage_crore": 2500, "dates": "Nov 23-27, 2020", "landfall": "Near Puducherry", "impact": "Crop damage, power outages"},
        {"name": "Cyclone Gaja", "year": 2018, "category": "Very Severe", "max_wind_kmh": 120, "rainfall_mm": 180, "damage_crore": 6000, "dates": "Nov 10-17, 2018", "landfall": "Near Vedaranyam", "impact": "Direct hit, 130km/h winds"},
        {"name": "Cyclone Vardah", "year": 2016, "category": "Very Severe", "max_wind_kmh": 140, "rainfall_mm": 150, "damage_crore": 5000, "dates": "Dec 6-13, 2016", "landfall": "Near Chennai", "impact": "Direct hit, 130km/h winds"},
        {"name": "Cyclone Thane", "year": 2011, "category": "Very Severe", "max_wind_kmh": 140, "rainfall_mm": 120, "damage_crore": 2200, "dates": "Dec 25-31, 2011", "landfall": "Near Cuddalore", "impact": "Heavy rains"},
        {"name": "Cyclone Nisha", "year": 2008, "category": "Cyclonic Storm", "max_wind_kmh": 75, "rainfall_mm": 500, "damage_crore": 4500, "dates": "Nov 25-27, 2008", "landfall": "Near Karaikal", "impact": "500mm in 48hrs"},
    ]
    if year: cyclones = [c for c in cyclones if c["year"] == year]
    if name: cyclones = [c for c in cyclones if name.lower() in c["name"].lower()]
    if min_wind: cyclones = [c for c in cyclones if c["max_wind_kmh"] >= min_wind]
    avg_wind = sum(c["max_wind_kmh"] for c in cyclones) / len(cyclones) if cyclones else 0
    return {
        "cyclones": cyclones,
        "summary": {
            "total": len(cyclones),
            "avg_wind": round(avg_wind) if avg_wind else 0,
            "max_rainfall": max((c["rainfall_mm"] for c in cyclones), default=0),
            "total_damage": sum(c["damage_crore"] for c in cyclones),
            "period": f"{min((c['year'] for c in cyclones), default=0)}-{max((c['year'] for c in cyclones), default=0)}",
        }
    }

def get_tsunamis():
    """Historical tsunami events in the Indian Ocean."""
    events = [
        {"name": "Indian Ocean Tsunami", "date": "2004-12-26", "wave_height_m": 30.0, "fatalities": 227898},
        {"name": "Krakatoa Tsunami", "date": "1883-08-27", "wave_height_m": 37.0, "fatalities": 36417},
        {"name": "Makran Coast Tsunami", "date": "1945-11-28", "wave_height_m": 13.0, "fatalities": 4000},
        {"name": "Andaman Tsunami", "date": "1941-06-26", "wave_height_m": 1.5, "fatalities": 5000},
        {"name": "Sumatra Aftershock", "date": "2005-03-28", "wave_height_m": 3.0, "fatalities": 1313},
        {"name": "Sulawesi Tsunami", "date": "2018-09-28", "wave_height_m": 11.0, "fatalities": 4340},
        {"name": "Anak Krakatau", "date": "2018-12-22", "wave_height_m": 5.0, "fatalities": 437},
    ]
    return {
        "events": events,
        "summary": {
            "total": len(events),
            "max_wave": max(e["wave_height_m"] for e in events),
            "total_fatalities": sum(e["fatalities"] for e in events),
            "period": "1883-2018",
        }
    }
