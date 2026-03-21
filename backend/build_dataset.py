"""
build_dataset.py - ClimAI Historical Dataset Builder
Run ONCE to build data/ folder. Re-run monthly to refresh.
Output: data/weather_history.json, data/earthquake_history.json,
        data/aqi_history.json, data/dataset_meta.json
"""
import json, os, requests
from datetime import datetime, timedelta

LAT, LON = 13.0827, 80.2707
DATA_DIR  = "data"
os.makedirs(DATA_DIR, exist_ok=True)

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

# ── 1. WEATHER HISTORY ──────────────────────────────────────────────────────
def fetch_weather_history():
    log("Fetching 5-year weather history from Open-Meteo Archive...")
    end   = datetime.now() - timedelta(days=7)
    start = end - timedelta(days=365 * 5)
    r = requests.get("https://archive-api.open-meteo.com/v1/archive", params={
        "latitude": LAT, "longitude": LON,
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date":   end.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,rain_sum",
        "timezone": "Asia/Kolkata",
    }, timeout=60)
    r.raise_for_status()
    raw   = r.json()
    daily = raw.get("daily", {})
    times    = daily.get("time", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])
    precip   = daily.get("precipitation_sum", [])
    wind     = daily.get("wind_speed_10m_max", [])
    rain     = daily.get("rain_sum", [])

    records = [{"date": d,
                "temp_max": temp_max[i] if i < len(temp_max) else None,
                "temp_min": temp_min[i] if i < len(temp_min) else None,
                "precip":   precip[i]   if i < len(precip)   else None,
                "wind":     wind[i]     if i < len(wind)      else None,
                "rain":     rain[i]     if i < len(rain)       else None}
               for i, d in enumerate(times)]

    # Monthly summaries
    monthly = {}
    for rec in records:
        k = rec["date"][:7]
        if k not in monthly:
            monthly[k] = {"temps_max": [], "temps_min": [], "precip": [], "wind": []}
        for field, bucket in [("temp_max","temps_max"),("temp_min","temps_min"),("precip","precip"),("wind","wind")]:
            if rec[field] is not None: monthly[k][bucket].append(rec[field])

    def avg(lst): return round(sum(lst)/len(lst), 1) if lst else None
    monthly_summary = [{"month": m,
                         "avg_temp_max": avg(v["temps_max"]),
                         "avg_temp_min": avg(v["temps_min"]),
                         "total_precip": round(sum(v["precip"]),1) if v["precip"] else 0,
                         "avg_wind":     avg(v["wind"])}
                        for m, v in sorted(monthly.items())]

    # Yearly summaries
    yearly = {}
    for rec in records:
        yr = rec["date"][:4]
        if yr not in yearly: yearly[yr] = {"temps_max":[], "precip":[]}
        if rec["temp_max"] is not None: yearly[yr]["temps_max"].append(rec["temp_max"])
        if rec["precip"]   is not None: yearly[yr]["precip"].append(rec["precip"])
    yearly_summary = {yr: {"avg_temp_max": avg(v["temps_max"]),
                            "total_precip_mm": round(sum(v["precip"]),1) if v["precip"] else 0}
                      for yr, v in sorted(yearly.items())}

    result = {
        "location": "Chennai, India", "lat": LAT, "lon": LON,
        "period_start": start.strftime("%Y-%m-%d"),
        "period_end":   end.strftime("%Y-%m-%d"),
        "total_days":   len(records),
        "daily":        records,
        "monthly":      monthly_summary,
        "yearly":       yearly_summary,
    }
    path = os.path.join(DATA_DIR, "weather_history.json")
    with open(path, "w") as f: json.dump(result, f)
    log(f"Saved {len(records)} days -> {path}")
    return result

# ── 2. EARTHQUAKE HISTORY ───────────────────────────────────────────────────
def fetch_earthquake_history():
    log("Fetching earthquake history from USGS...")
    end   = datetime.now()
    start = end - timedelta(days=365 * 5)
    r = requests.get("https://earthquake.usgs.gov/fdsnws/event/1/query", params={
        "format": "geojson",
        "starttime": start.strftime("%Y-%m-%d"),
        "endtime":   end.strftime("%Y-%m-%d"),
        "minlatitude": 3.0, "maxlatitude": 23.0,
        "minlongitude": 70.0, "maxlongitude": 90.0,
        "minmagnitude": 4.0,
        "orderby": "time", "limit": 1000,
    }, timeout=60)
    r.raise_for_status()
    raw = r.json()
    events = []
    for feat in raw.get("features", []):
        props  = feat.get("properties", {})
        coords = feat.get("geometry", {}).get("coordinates", [None, None, None])
        events.append({
            "id":        feat.get("id"),
            "time":      datetime.utcfromtimestamp(props["time"]/1000).strftime("%Y-%m-%dT%H:%M:%SZ") if props.get("time") else None,
            "magnitude": props.get("mag"),
            "place":     props.get("place"),
            "longitude": coords[0], "latitude": coords[1], "depth_km": coords[2],
        })
    result = {"region": "Bay of Bengal / South India",
              "period_start": start.strftime("%Y-%m-%d"),
              "period_end":   end.strftime("%Y-%m-%d"),
              "total_events": len(events), "events": events}
    path = os.path.join(DATA_DIR, "earthquake_history.json")
    with open(path, "w") as f: json.dump(result, f)
    log(f"Saved {len(events)} earthquake events -> {path}")
    return result

# ── 3. AQI HISTORY ──────────────────────────────────────────────────────────
def fetch_aqi_history():
    log("Fetching AQI history from Open-Meteo Air Quality...")
    end   = datetime.now() - timedelta(days=2)
    start = end - timedelta(days=365)
    try:
        r = requests.get("https://air-quality-api.open-meteo.com/v1/air-quality", params={
            "latitude": LAT, "longitude": LON,
            "hourly": "pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi",
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date":   end.strftime("%Y-%m-%d"),
            "timezone": "Asia/Kolkata",
        }, timeout=60)
        r.raise_for_status()
        hourly = r.json().get("hourly", {})
        times  = hourly.get("time", [])
        pm25   = hourly.get("pm2_5", [])
        pm10   = hourly.get("pm10", [])
        aqi_eu = hourly.get("european_aqi", [])
        no2    = hourly.get("nitrogen_dioxide", [])
        o3     = hourly.get("ozone", [])
        daily = {}
        for i, ts in enumerate(times):
            day = ts[:10]
            if day not in daily: daily[day] = {"pm25":[],"pm10":[],"aqi":[],"no2":[],"o3":[]}
            if i < len(pm25)   and pm25[i]   is not None: daily[day]["pm25"].append(pm25[i])
            if i < len(pm10)   and pm10[i]   is not None: daily[day]["pm10"].append(pm10[i])
            if i < len(aqi_eu) and aqi_eu[i] is not None: daily[day]["aqi"].append(aqi_eu[i])
            if i < len(no2)    and no2[i]    is not None: daily[day]["no2"].append(no2[i])
            if i < len(o3)     and o3[i]     is not None: daily[day]["o3"].append(o3[i])
        def avg(lst): return round(sum(lst)/len(lst),1) if lst else None
        daily_records = [{"date": day,
                           "avg_pm25": avg(v["pm25"]), "avg_pm10": avg(v["pm10"]),
                           "avg_aqi":  avg(v["aqi"]),  "avg_no2":  avg(v["no2"]),
                           "avg_o3":   avg(v["o3"])}
                          for day, v in sorted(daily.items())]
        result = {"location": "Chennai, India",
                  "period_start": start.strftime("%Y-%m-%d"),
                  "period_end":   end.strftime("%Y-%m-%d"),
                  "total_days": len(daily_records), "daily": daily_records}
    except Exception as e:
        log(f"AQI fetch failed: {e}")
        result = {"error": str(e), "daily": [], "total_days": 0}
    path = os.path.join(DATA_DIR, "aqi_history.json")
    with open(path, "w") as f: json.dump(result, f)
    log(f"Saved AQI history ({result.get('total_days',0)} days) -> {path}")
    return result

# ── 4. DATASET META ──────────────────────────────────────────────────────────
def build_meta(weather, earthquakes, aqi):
    log("Building dataset metadata + statistics summary...")
    def avg(lst): return round(sum(lst)/len(lst),1) if lst else None
    daily_temps  = [d["temp_max"] for d in weather.get("daily",[]) if d.get("temp_max") is not None]
    daily_precip = [d["precip"]   for d in weather.get("daily",[]) if d.get("precip")   is not None]
    daily_wind   = [d["wind"]     for d in weather.get("daily",[]) if d.get("wind")     is not None]
    eq_mags      = [e["magnitude"] for e in earthquakes.get("events",[]) if e.get("magnitude") is not None]
    aqi_vals     = [d["avg_aqi"]  for d in aqi.get("daily",[]) if d.get("avg_aqi") is not None]
    monthly_precip = {}
    for d in weather.get("daily", []):
        if d.get("precip") is not None:
            m = int(d["date"][5:7])
            monthly_precip[m] = monthly_precip.get(m, 0) + d["precip"]
    meta = {
        "built_at":     datetime.now().isoformat(),
        "location":     "Chennai, India (13.08N, 80.27E)",
        "data_sources": ["Open-Meteo Archive", "USGS Earthquake API", "Open-Meteo AQI"],
        "weather": {
            "period":               f"{weather.get('period_start')} to {weather.get('period_end')}",
            "total_days":           len(daily_temps),
            "avg_temp_max_c":       avg(daily_temps),
            "max_temp_ever_c":      max(daily_temps)  if daily_temps  else None,
            "min_temp_ever_c":      min(daily_temps)  if daily_temps  else None,
            "avg_daily_precip_mm":  round(sum(daily_precip)/len(daily_precip),2) if daily_precip else None,
            "max_single_day_rain":  max(daily_precip) if daily_precip else None,
            "avg_wind_kmh":         avg(daily_wind),
            "max_wind_kmh":         max(daily_wind)   if daily_wind   else None,
            "monthly_total_precip_mm": {str(k): round(v,1) for k,v in sorted(monthly_precip.items())},
            "yearly_summary":       weather.get("yearly", {}),
            "peak_monsoon_months":  "June-November (Northeast monsoon dominant Oct-Dec)",
            "heatwave_season":      "March-June (temps frequently exceed 38C)",
            "cyclone_peak_season":  "October-December (Bay of Bengal cyclogenesis)",
        },
        "earthquakes": {
            "total_events_5yr": earthquakes.get("total_events", 0),
            "avg_magnitude":    round(sum(eq_mags)/len(eq_mags),2) if eq_mags else None,
            "max_magnitude":    max(eq_mags) if eq_mags else None,
            "region":           "Bay of Bengal / South India (~1000km radius from Chennai)",
            "risk_note":        "Chennai on stable Deccan shield. Major risk from Bay of Bengal subduction zone.",
        },
        "aqi": {
            "total_days": aqi.get("total_days", 0),
            "avg_aqi":    avg(aqi_vals),
            "max_aqi":    max(aqi_vals) if aqi_vals else None,
            "context":    "Typically moderate (50-100). Winter spikes (Nov-Jan) from crop burning and low wind.",
        },
        "notable_events": [
            {"event": "Cyclone Michaung",          "date": "December 2023",          "impact": "Category 1 landfall, severe Chennai flooding, 2500mm rain in 48hr"},
            {"event": "2015 Chennai Floods",       "date": "November-December 2015", "impact": "Worst flooding in 100 years, 500+ deaths, $3B damage"},
            {"event": "2004 Indian Ocean Tsunami", "date": "December 26 2004",       "impact": "Mag 9.1 Sumatra earthquake, Chennai coastline devastated"},
            {"event": "Cyclone Vardah",            "date": "December 2016",          "impact": "Direct hit Chennai, 100+ km/h winds, widespread damage"},
            {"event": "Cyclone Nivar",             "date": "November 2020",          "impact": "Very severe cyclone, landfall near Puducherry, heavy Chennai rain"},
        ],
        "climate_patterns": {
            "type":               "Tropical wet and dry (Koppen Aw)",
            "annual_rainfall_mm": "~1400mm avg, 60% from Northeast monsoon Oct-Dec",
            "sea_surface_temp":   "Bay of Bengal 28-30C peak Jun-Oct (cyclone fuel)",
            "urban_heat_island":  "UHI adds +1.5 to 2.5C vs rural",
            "warming_trend":      "Max temps rising ~0.3C per decade since 1980",
            "flood_risk_zones":   "Adyar, Cooum, Buckingham Canal flood plains highest risk",
        },
    }
    path = os.path.join(DATA_DIR, "dataset_meta.json")
    with open(path, "w") as f: json.dump(meta, f, indent=2)
    log(f"Saved dataset metadata -> {path}")
    return meta

# ── MAIN ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log("=== ClimAI Dataset Builder ===")
    weather     = fetch_weather_history()
    earthquakes = fetch_earthquake_history()
    aqi         = fetch_aqi_history()
    meta        = build_meta(weather, earthquakes, aqi)
    log("=== Build complete ===")
    log(f"Weather: {weather.get('total_days',0)} days | EQ: {earthquakes.get('total_events',0)} events | AQI: {aqi.get('total_days',0)} days")
    log(f"Avg max temp: {meta['weather'].get('avg_temp_max_c')}C | Max rain: {meta['weather'].get('max_single_day_rain')}mm")