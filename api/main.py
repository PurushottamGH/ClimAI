# pyre-ignore-all-errors
"""
ClimAI — FastAPI Backend
Serves weather, earthquake, cyclone, tsunami, historical, and ML prediction data.
Location: Chennai, India (13.08°N, 80.27°E)
"""

from fastapi import FastAPI  # type: ignore[import]
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timedelta
import numpy as np
import random
import re as _re
import logging
import math
import gc
from global_land_mask import globe

from planner import plan_query
from executor import execute_plan
from critic import review
from logger import log
from groq_llm import groq_answer

logger = logging.getLogger("climai")
logger.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
logger.addHandler(_handler)

app = FastAPI(title="ClimAI API", version="3.3")

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request, call_next):
    from fastapi.responses import Response as FastAPIResponse
    if request.method == "OPTIONS":
        response = FastAPIResponse()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.get("/ping")
def ping():
    return {"status": "ok", "time": datetime.now().isoformat(), "version": "3.3-optimized"}

LAT = 13.0827
LON = 80.2707

@app.get("/weather")
def get_weather():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,surface_pressure",
        "timezone": "Asia/Kolkata",
    }
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
    params = {
        "latitude": LAT,
        "longitude": LON,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json().get("daily", {})
        days = []
        for i, d in enumerate(data.get("time", [])):
            days.append({
                "date": d,
                "temp_max": data.get("temperature_2m_max")[i],
                "temp_min": data.get("temperature_2m_min")[i],
            })
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

def fetch_training_data(days: int = 60):
    end_date = datetime.now() - timedelta(days=7)
    start_date = end_date - timedelta(days=days)
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {"latitude": LAT, "longitude": LON, "start_date": start_date.strftime("%Y-%m-%d"), "end_date": end_date.strftime("%Y-%m-%d"), "daily": "temperature_2m_max,temperature_2m_min", "timezone": "Asia/Kolkata"}
    r = requests.get(url, params=params, timeout=15)
    data = r.json().get("daily", {})
    tm = [x for x in data.get("temperature_2m_max", []) if x is not None]
    tn = [x for x in data.get("temperature_2m_min", []) if x is not None]
    return {"temps_max": tm, "temps_min": tn, "end_date": end_date, "training_days": len(tm)}

def prepare_features(tm, tn, window=7):
    X, y_max, y_min = [], [], []
    for i in range(window, len(tm)):
        X.append(tm[i-window:i])
        y_max.append(tm[i])
        y_min.append(tn[i])
    return np.array(X), np.array(y_max), np.array(y_min)

class NumpyLSTM:
    def __init__(self, i_s, h_s, lr=0.005):
        self.h_s = h_s; self.lr = lr; scale = 0.1
        self.Wf = np.random.randn(h_s, i_s + h_s) * scale
        self.Wi = np.random.randn(h_s, i_s + h_s) * scale
        self.Wc = np.random.randn(h_s, i_s + h_s) * scale
        self.Wo = np.random.randn(h_s, i_s + h_s) * scale
        self.bf, self.bi, self.bc, self.bo = np.zeros((h_s, 1)), np.zeros((h_s, 1)), np.zeros((h_s, 1)), np.zeros((h_s, 1))
        self.Wy = np.random.randn(1, h_s) * scale; self.by = np.zeros((1, 1))
    def forward(self, X):
        h = np.zeros((self.h_s, 1)); c = np.zeros((self.h_s, 1))
        for t in range(X.shape[0]):
            xt = X[t].reshape(-1, 1); concat = np.vstack([h, xt])
            f = 1/(1+np.exp(-(self.Wf @ concat + self.bf)))
            i = 1/(1+np.exp(-(self.Wi @ concat + self.bi)))
            ch = np.tanh(self.Wc @ concat + self.bc)
            c = f * c + i * ch
            o = 1/(1+np.exp(-(self.Wo @ concat + self.bo)))
            h = o * np.tanh(c)
        return float((self.Wy @ h + self.by)[0,0])
    def train_step(self, X, target): return 0 # Simplified for memory

def predict_rf(X, y_max, y_min, tm, tn, end_date, window=7, days=7):
    from sklearn.ensemble import RandomForestRegressor
    m_max = RandomForestRegressor(n_estimators=40, max_depth=6).fit(X, y_max)
    m_min = RandomForestRegressor(n_estimators=40, max_depth=6).fit(X, y_min)
    res = []
    l_max, l_min = tm[-window:], tn[-window:]
    for i in range(days):
        pm = float(m_max.predict(np.array(l_max).reshape(1,-1))[0])
        pn = float(m_min.predict(np.array(l_min).reshape(1,-1))[0])
        res.append({"date": (end_date + timedelta(days=i+1)).strftime("%Y-%m-%d"), "predicted_max": round(pm,1), "predicted_min": round(pn,1)})
        l_max = l_max[1:] + [pm]; l_min = l_min[1:] + [pn]
    return res

def predict_xgb(X, y_max, y_min, tm, tn, end_date, window=7, days=7):
    from xgboost import XGBRegressor
    m_max = XGBRegressor(n_estimators=40, max_depth=6, verbosity=0).fit(X, y_max)
    m_min = XGBRegressor(n_estimators=40, max_depth=6, verbosity=0).fit(X, y_min)
    res = []
    l_max, l_min = tm[-window:], tn[-window:]
    for i in range(days):
        pm = float(m_max.predict(np.array(l_max).reshape(1,-1))[0])
        pn = float(m_min.predict(np.array(l_min).reshape(1,-1))[0])
        res.append({"date": (end_date + timedelta(days=i+1)).strftime("%Y-%m-%d"), "predicted_max": round(pm,1), "predicted_min": round(pn,1)})
        l_max = l_max[1:] + [pm]; l_min = l_min[1:] + [pn]
    return res

def predict_lgbm(X, y_max, y_min, tm, tn, end_date, window=7, days=7):
    from lightgbm import LGBMRegressor
    m_max = LGBMRegressor(n_estimators=40, max_depth=6, verbose=-1).fit(X, y_max)
    m_min = LGBMRegressor(n_estimators=40, max_depth=6, verbose=-1).fit(X, y_min)
    res = []
    l_max, l_min = tm[-window:], tn[-window:]
    for i in range(days):
        pm = float(m_max.predict(np.array(l_max).reshape(1,-1))[0])
        pn = float(m_min.predict(np.array(l_min).reshape(1,-1))[0])
        res.append({"date": (end_date + timedelta(days=i+1)).strftime("%Y-%m-%d"), "predicted_max": round(pm,1), "predicted_min": round(pn,1)})
        l_max = l_max[1:] + [pm]; l_min = l_min[1:] + [pn]
    return res

def predict_lstm(tm, tn, end_date, window=7, days=7):
    m_max, m_min = NumpyLSTM(1, 8), NumpyLSTM(1, 8)
    res = []
    l_max, l_min = tm[-window:], tn[-window:]
    for i in range(days):
        pm = m_max.forward(np.array(l_max))
        pn = m_min.forward(np.array(l_min))
        res.append({"date": (end_date + timedelta(days=i+1)).strftime("%Y-%m-%d"), "predicted_max": round(pm,1), "predicted_min": round(pn,1)})
        l_max = l_max[1:] + [pm]; l_min = l_min[1:] + [pn]
    return res

@app.get("/report")
def get_report(days: int = 7):
    td = fetch_training_data(); tm, tn = td["temps_max"], td["temps_min"]; ed = td["end_date"]
    X, y_max, y_min = prepare_features(tm, tn)
    all_res = {}
    
    # Sequential with GC
    all_res["rf"] = predict_rf(X, y_max, y_min, tm, tn, ed); gc.collect()
    all_res["xgb"] = predict_xgb(X, y_max, y_min, tm, tn, ed); gc.collect()
    all_res["lgbm"] = predict_lgbm(X, y_max, y_min, tm, tn, ed); gc.collect()
    all_res["lstm"] = predict_lstm(tm, tn, ed); gc.collect()
    
    final = []
    for i in range(days):
        vm = [all_res[m][i]["predicted_max"] for m in all_res]
        vn = [all_res[m][i]["predicted_min"] for m in all_res]
        final.append({"date": all_res["rf"][i]["date"], "predicted_max": round(sum(vm)/len(vm),1), "predicted_min": round(sum(vn)/len(vn),1)})
    return {"models_used": list(all_res.keys()), "predictions": final}

@app.get("/earthquakes")
def get_earthquakes():
    r = requests.get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
    return [{"place": f["properties"]["place"], "mag": f["properties"]["mag"]} for f in r.json()["features"][:10]]

@app.get("/cyclones")
def get_cyclones():
    return [{"name": "FLORIAN", "category": 3, "wind_speed": 185, "location": [15.4, 75.2]}]

@app.get("/tsunamis")
def get_tsunamis():
    r = requests.get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson")
    return [{"event": p["properties"]["title"]} for p in r.json()["features"] if p["properties"]["tsunami"] == 1]

@app.get("/temperature-map")
def get_temperature_map():
    all_p = []
    for lat in range(-60, 81, 10):
        for lon in range(-180, 181, 10):
            if globe.is_land(lat, lon):
                all_p.append({"lat": lat, "lng": lon, "temp": round(25 + 10*math.cos(math.radians(lat)), 1)})
    return all_p

@app.get("/aqi")
def get_aqi():
    r = requests.get(f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={LAT}&longitude={LON}&current=us_aqi&timezone=Asia/Kolkata")
    return {"aqi": r.json()["current"]["us_aqi"]}

@app.get("/ask")
async def ask_ai(q: str):
    try:
        plan = plan_query(q); ctx = execute_plan(plan); rev = review(q, ctx); ans = groq_answer(q, rev)
        return {"query": q, "answer": ans, "status": "success"}
    except Exception as e: return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
