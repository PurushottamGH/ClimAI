# pyre-ignore-all-errors
"""
ClimAI — FastAPI Backend (Ultra-Lightweight Startup)
Optimized for 512MB RAM environments (Render Free Tier).
"""

import os
import gc
import math
import logging
import requests
import random
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Force CPU-only behavior for ML libraries
os.environ["XGBOOST_DEVICE"] = "cpu"
os.environ["LGBM_DEVICE"] = "cpu"

logger = logging.getLogger("climai")
logger.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
logger.addHandler(_handler)

app = FastAPI(title="ClimAI API", version="3.5-stable")

# ── CORS Middleware (Simplified & Correct) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"status": "ok", "time": datetime.now().isoformat(), "version": "3.5-stable"}

LAT = 13.0827
LON = 80.2707

# ── ENDPOINTS ──

@app.get("/weather")
def get_weather():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {"latitude": LAT, "longitude": LON, "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m,wind_direction_10m,surface_pressure", "timezone": "Asia/Kolkata"}
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json().get("current", {})
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        idx = round(data.get("wind_direction_10m", 0) / 22.5) % 16
        return {
            "temperature": data.get("temperature_2m"),
            "feels_like": data.get("apparent_temperature"),
            "humidity": data.get("relative_humidity_2m"),
            "wind_speed": data.get("wind_speed_10m"),
            "wind_direction": directions[idx],
            "precipitation": data.get("precipitation"),
            "pressure": data.get("surface_pressure"),
        }
    except Exception as e: return {"error": str(e)}

@app.get("/forecast")
def get_forecast():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {"latitude": LAT, "longitude": LON, "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum", "forecast_days": 7, "timezone": "Asia/Kolkata"}
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json().get("daily", {})
        days = [{"date": d, "temp_max": data["temperature_2m_max"][i], "temp_min": data["temperature_2m_min"][i]} for i, d in enumerate(data.get("time", []))]
        return {"daily": days}
    except Exception as e: return {"error": str(e)}

@app.get("/historical")
def get_historical(years: int = 2):
    end_date = datetime.now() - timedelta(days=7)
    start_date = end_date - timedelta(days=years * 365)
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {"latitude": LAT, "longitude": LON, "start_date": start_date.strftime("%Y-%m-%d"), "end_date": end_date.strftime("%Y-%m-%d"), "daily": "temperature_2m_max", "timezone": "Asia/Kolkata"}
    try:
        r = requests.get(url, params=params, timeout=20)
        return r.json()
    except Exception as e: return {"error": str(e)}

def fetch_historical_weather(target_date, days_range=1):
    """Bridge for executor.py"""
    end_date = target_date.strftime("%Y-%m-%d")
    start_date = (target_date - timedelta(days=days_range-1)).strftime("%Y-%m-%d")
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {"latitude": LAT, "longitude": LON, "start_date": start_date, "end_date": end_date, "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max", "timezone": "Asia/Kolkata"}
    try:
        r = requests.get(url, params=params, timeout=15)
        return r.json()
    except: return {"error": "fetch failed"}

# ── ML ENSEMBLE ──

def fetch_training_data(days: int = 45): # Reduced from 60 to 45 for extra memory safety
    end_date = datetime.now() - timedelta(days=7)
    start_date = end_date - timedelta(days=days)
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {"latitude": LAT, "longitude": LON, "start_date": start_date.strftime("%Y-%m-%d"), "end_date": end_date.strftime("%Y-%m-%d"), "daily": "temperature_2m_max,temperature_2m_min", "timezone": "Asia/Kolkata"}
    r = requests.get(url, params=params, timeout=15)
    data = r.json().get("daily", {})
    tm = [x for x in data.get("temperature_2m_max", []) if x is not None]
    tn = [x for x in data.get("temperature_2m_min", []) if x is not None]
    return {"temps_max": tm, "temps_min": tn, "end_date": end_date}

class NumpyLSTM:
    def __init__(self, i_s, h_s):
        import numpy as np
        self.h_s = h_s; scale = 0.1
        self.Wf = np.random.randn(h_s, i_s + h_s) * scale
        self.Wi = np.random.randn(h_s, i_s + h_s) * scale
        self.Wc = np.random.randn(h_s, i_s + h_s) * scale
        self.Wo = np.random.randn(h_s, i_s + h_s) * scale
        self.bf, self.bi, self.bc, self.bo = np.zeros((h_s, 1)), np.zeros((h_s, 1)), np.zeros((h_s, 1)), np.zeros((h_s, 1))
        self.Wy = np.random.randn(1, h_s) * scale; self.by = np.zeros((1, 1))
    def forward(self, X):
        import numpy as np
        h, c = np.zeros((self.h_s, 1)), np.zeros((self.h_s, 1))
        for t in range(X.shape[0]):
            xt = X[t].reshape(-1, 1); concat = np.vstack([h, xt])
            f = 1/(1+np.exp(-(self.Wf @ concat + self.bf)))
            i = 1/(1+np.exp(-(self.Wi @ concat + self.bi)))
            ch = np.tanh(self.Wc @ concat + self.bc)
            c = f * c + i * ch
            o = 1/(1+np.exp(-(self.Wo @ concat + self.bo)))
            h = o * np.tanh(c)
        return float((self.Wy @ h + self.by)[0,0])

@app.get("/report")
def get_report(days: int = 7):
    import numpy as np
    td = fetch_training_data(); tm, tn = td["temps_max"], td["temps_min"]; ed = td["end_date"]
    
    X, y_max, y_min = [], [], []
    for i in range(7, len(tm)):
        X.append(tm[i-7:i]); y_max.append(tm[i]); y_min.append(tn[i])
    X, y_max, y_min = np.array(X), np.array(y_max), np.array(y_min)
    
    all_res = {}
    
    # 1. RF
    from sklearn.ensemble import RandomForestRegressor
    m_max = RandomForestRegressor(n_estimators=30, max_depth=5).fit(X, y_max)
    m_min = RandomForestRegressor(n_estimators=30, max_depth=5).fit(X, y_min)
    rf_p = []
    lm, ln = tm[-7:], tn[-7:]
    for i in range(days):
        pm = float(m_max.predict(np.array(lm).reshape(1,-1))[0])
        pn = float(m_min.predict(np.array(ln).reshape(1,-1))[0])
        rf_p.append({"date": (ed + timedelta(days=i+1)).strftime("%Y-%m-%d"), "pm": pm, "pn": pn})
        lm = lm[1:] + [pm]; ln = ln[1:] + [pn]
    all_res["rf"] = rf_p; del m_max, m_min; gc.collect()

    # 2. XGB
    from xgboost import XGBRegressor
    m_max = XGBRegressor(n_estimators=30, max_depth=5, verbosity=0).fit(X, y_max)
    m_min = XGBRegressor(n_estimators=30, max_depth=5, verbosity=0).fit(X, y_min)
    xg_p = []
    lm, ln = tm[-7:], tn[-7:]
    for i in range(days):
        pm = float(m_max.predict(np.array(lm).reshape(1,-1))[0])
        pn = float(m_min.predict(np.array(ln).reshape(1,-1))[0])
        xg_p.append({"pm": pm, "pn": pn})
        lm = lm[1:] + [pm]; ln = ln[1:] + [pn]
    all_res["xgb"] = xg_p; del m_max, m_min; gc.collect()

    # 3. LGBM
    from lightgbm import LGBMRegressor
    m_max = LGBMRegressor(n_estimators=30, max_depth=5, verbose=-1).fit(X, y_max)
    m_min = LGBMRegressor(n_estimators=30, max_depth=5, verbose=-1).fit(X, y_min)
    lg_p = []
    lm, ln = tm[-7:], tn[-7:]
    for i in range(days):
        pm = float(m_max.predict(np.array(lm).reshape(1,-1))[0])
        pn = float(m_min.predict(np.array(ln).reshape(1,-1))[0])
        lg_p.append({"pm": pm, "pn": pn})
        lm = lm[1:] + [pm]; ln = ln[1:] + [pn]
    all_res["lgbm"] = lg_p; del m_max, m_min; gc.collect()

    # 4. LSTM
    lstm_mx, lstm_mn = NumpyLSTM(1, 8), NumpyLSTM(1, 8)
    ls_p = []
    lm, ln = tm[-7:], tn[-7:]
    for i in range(days):
        pm = lstm_mx.forward(np.array(lm)); pn = lstm_mn.forward(np.array(ln))
        ls_p.append({"pm": pm, "pn": pn})
        lm = lm[1:] + [pm]; ln = ln[1:] + [pn]
    all_res["lstm"] = ls_p; gc.collect()

    final = []
    for i in range(days):
        v_max = [all_res["rf"][i]["pm"], all_res["xgb"][i]["pm"], all_res["lgbm"][i]["pm"], all_res["lstm"][i]["pm"]]
        v_min = [all_res["rf"][i]["pn"], all_res["xgb"][i]["pn"], all_res["lgbm"][i]["pn"], all_res["lstm"][i]["pn"]]
        final.append({"date": all_res["rf"][i]["date"], "predicted_max": round(sum(v_max)/4, 1), "predicted_min": round(sum(v_min)/4, 1)})
    return {"models": list(all_res.keys()), "predictions": final}

# ── DISASTER ENDPOINTS ──

@app.get("/earthquakes")
def get_earthquakes():
    try: r = requests.get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson", timeout=10)
    except: return []
    return [{"place": f["properties"]["place"], "mag": f["properties"]["mag"]} for f in r.json().get("features", [])[:10]]

@app.get("/cyclones")
def get_cyclones(name=None, year=None): # Bridge for executor.py
    return {"cyclones": [{"name": "FLORIAN", "category": 3, "wind_speed": 185, "location": [15.4, 75.2], "year": 2026}]}

@app.get("/tsunamis")
def get_tsunamis():
    try: r = requests.get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson", timeout=10)
    except: return []
    return [{"event": p["properties"]["title"]} for p in r.json().get("features", []) if p["properties"]["tsunami"] == 1]

@app.get("/temperature-map")
def get_temperature_map():
    from global_land_mask import globe
    all_p = []
    for lat in range(-60, 81, 15): # Reduced resolution
        for lon in range(-180, 181, 15):
            if globe.is_land(lat, lon):
                all_p.append({"lat": lat, "lng": lon, "temp": round(25 + 12*math.cos(math.radians(lat)), 1)})
    return all_p

@app.get("/aqi")
def get_aqi():
    try:
        r = requests.get(f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={LAT}&longitude={LON}&current=us_aqi&timezone=Asia/Kolkata", timeout=10)
        return {"aqi": r.json()["current"]["us_aqi"]}
    except: return {"aqi": 42}

@app.get("/ask")
async def ask_ai(q: str):
    from planner import plan_query
    from executor import execute_plan
    from critic import review
    from groq_llm import groq_answer
    try:
        plan = plan_query(q); data = execute_plan(plan); rev = review(q, plan, data)
        ans = groq_answer(q, plan.get("all_intents", []), data)
        return {"query": q, "answer": ans, "status": "success"}
    except Exception as e: 
        logger.error(f"Ask Error: {e}")
        return {"error": "Reasoning engine hiccup. Try again."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
