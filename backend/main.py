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
# from global_land_mask import globe  # Removed from top to save startup memory

from planner import plan_query
from executor import execute_plan
from critic import review
from logger import log
from groq_llm import groq_answer   # ← ADD THIS LINE

logger = logging.getLogger("climai")
logger.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
logger.addHandler(_handler)

app = FastAPI(title="ClimAI API", version="3.5.2-pro")

# ── CORS Configuration ──────────────────────────────────────────────────────
# Using the standard FastAPI CORSMiddleware. 
# This handles preflight (OPTIONS) and header injection correctly for all routes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # Set to True for better compatibility with standard fetch
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"status": "ok", "time": datetime.now().isoformat(), "version": "3.5-pro"}

# Chennai coordinates
LAT = 13.0827
LON = 80.2707

# ── Simple in-memory cache to prevent Open-Meteo 429 rate limits ──
_cache: dict = {}
_cache_ttl: dict = {}

def _get_cache(key: str, ttl_seconds: int = 300):
    if key in _cache and key in _cache_ttl:
        age = (datetime.now() - _cache_ttl[key]).total_seconds()
        if age < ttl_seconds:
            return _cache[key]
    return None

def _set_cache(key: str, value):
    _cache[key] = value
    _cache_ttl[key] = datetime.now()


# ════════════════════════════════
# /weather — Current conditions (Open Meteo)
# ════════════════════════════════
@app.get("/weather")
def get_weather():
    """Current weather for Chennai."""
    cached = _get_cache("weather", ttl_seconds=120)
    if cached: return cached
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

        result = {
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
        _set_cache("weather", result)
        return result
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════
# /forecast — 7-day daily forecast
# ════════════════════════════════
@app.get("/forecast")
def get_forecast():
    """7-day daily forecast for Chennai."""
    cached = _get_cache("forecast", 300)
    if cached: return cached
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

        result = {"daily": days, "hourly": hourly_data}
        _set_cache("forecast", result)
        return result
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════
# /historical — 5-year historical data (Open Meteo Archive API)
# ════════════════════════════════
@app.get("/historical")
def get_historical(years: int = 5):
    # Open-Meteo Archive API lags by about 5-7 days.
    # We must offset the end date to avoid a 400 Bad Request.
    end_date = datetime.now() - timedelta(days=7)
    start_date = end_date - timedelta(days=years * 365)

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
        "timezone": "Asia/Kolkata",
    }
    try:
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        daily = data.get("daily", {})

        times = daily.get("time", [])
        temp_max = daily.get("temperature_2m_max", [])
        temp_min = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        wind = daily.get("wind_speed_10m_max", [])

        # Return monthly averages for efficiency
        monthly = {}
        for i, t in enumerate(times):
            month_key = t[:7]  # YYYY-MM
            if month_key not in monthly:
                monthly[month_key] = {"temps_max": [], "temps_min": [], "precip": [], "wind": []}
            if i < len(temp_max) and temp_max[i] is not None:
                monthly[month_key]["temps_max"].append(temp_max[i])
            if i < len(temp_min) and temp_min[i] is not None:
                monthly[month_key]["temps_min"].append(temp_min[i])
            if i < len(precip) and precip[i] is not None:
                monthly[month_key]["precip"].append(precip[i])
            if i < len(wind) and wind[i] is not None:
                monthly[month_key]["wind"].append(wind[i])

        result = []
        for month, vals in sorted(monthly.items()):
            result.append({
                "month": month,
                "avg_temp_max": round(sum(vals["temps_max"]) / len(vals["temps_max"]), 1) if vals["temps_max"] else None,
                "avg_temp_min": round(sum(vals["temps_min"]) / len(vals["temps_min"]), 1) if vals["temps_min"] else None,
                "total_precip": round(sum(vals["precip"]), 1) if vals["precip"] else 0,
                "avg_wind": round(sum(vals["wind"]) / len(vals["wind"]), 1) if vals["wind"] else None,
            })

        return {
            "location": "Chennai, India",
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "monthly": result,
            "total_months": len(result),
        }
    except Exception as e:
        return {"error": str(e)}



# ════════════════════════════════════════════════════════════
# SHARED HELPERS — Data fetching & feature preparation
# ════════════════════════════════════════════════════════════

def fetch_training_data(days: int = 90):
    """Fetch recent temperature data for ML training."""
    end_date = datetime.now() - timedelta(days=7)  # Archive API lags ~5-7 days
    start_date = end_date - timedelta(days=days)

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
        "timezone": "Asia/Kolkata",
    }

    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    daily = data.get("daily", {})

    temps_max = [t for t in daily.get("temperature_2m_max", []) if t is not None]
    temps_min = [t for t in daily.get("temperature_2m_min", []) if t is not None]
    precip = [p for p in daily.get("precipitation_sum", []) if p is not None]
    wind = [w for w in daily.get("wind_speed_10m_max", []) if w is not None]

    return {
        "temps_max": temps_max,
        "temps_min": temps_min,
        "precip": precip,
        "wind": wind,
        "end_date": end_date,
        "training_days": len(temps_max),
    }


def prepare_features(temps_max, temps_min, window=7):
    """Prepare rolling-window features for tree-based models."""
    X = []
    y_max = []
    y_min = []
    for i in range(window, len(temps_max)):
        X.append(temps_max[i - window:i])
        y_max.append(temps_max[i])
        if i < len(temps_min):
            y_min.append(temps_min[i])
    X = np.array(X)
    y_max = np.array(y_max)
    y_min = np.array(y_min[:len(y_max)])
    return X, y_max, y_min


# ════════════════════════════════════════════════════════════
# LSTM CLASS — Pure numpy implementation
# ════════════════════════════════════════════════════════════

def _sigmoid(x):
    x = np.clip(x, -500, 500)
    return 1.0 / (1.0 + np.exp(-x))

def _tanh(x):
    return np.tanh(x)


class NumpyLSTM:
    """Real LSTM from scratch using pure numpy.
    Includes forget gate, input gate, output gate, cell state, and BPTT training."""

    def __init__(self, input_size, hidden_size, lr=0.005):
        self.hidden_size = hidden_size
        self.lr = lr
        scale = 0.1
        self.Wf = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wi = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wc = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.Wo = np.random.randn(hidden_size, input_size + hidden_size) * scale
        self.bf = np.zeros((hidden_size, 1))
        self.bi = np.zeros((hidden_size, 1))
        self.bc = np.zeros((hidden_size, 1))
        self.bo = np.zeros((hidden_size, 1))
        self.Wy = np.random.randn(1, hidden_size) * scale
        self.by = np.zeros((1, 1))

    def forward_sequence(self, X_seq):
        seq_len = X_seq.shape[0]
        h = np.zeros((self.hidden_size, 1))
        c = np.zeros((self.hidden_size, 1))
        self.cache = []
        for t in range(seq_len):
            x_t = X_seq[t].reshape(-1, 1)
            concat = np.vstack([h, x_t])
            f_t = _sigmoid(self.Wf @ concat + self.bf)
            i_t = _sigmoid(self.Wi @ concat + self.bi)
            c_hat = _tanh(self.Wc @ concat + self.bc)
            c = f_t * c + i_t * c_hat
            o_t = _sigmoid(self.Wo @ concat + self.bo)
            h = o_t * _tanh(c)
            self.cache.append((x_t, concat, f_t, i_t, c_hat, c.copy(), o_t, h.copy()))
        y = self.Wy @ h + self.by
        return float(y[0, 0]), h, c

    def train_step(self, X_seq, target):
        pred, h, c = self.forward_sequence(X_seq)
        dy = 2 * (pred - target)
        max_grad = 1.0
        self.Wy -= self.lr * np.clip(dy * h.T, -max_grad, max_grad)
        self.by -= self.lr * np.array([[dy]])
        if self.cache:
            x_t, concat, f_t, i_t, c_hat, c_state, o_t, h_state = self.cache[-1]
            dh = self.Wy.T * dy
            do = dh * _tanh(c_state) * o_t * (1 - o_t)
            dc = dh * o_t * (1 - _tanh(c_state) ** 2)
            df = dc * (c_state - i_t * c_hat) * f_t * (1 - f_t) if len(self.cache) > 1 else np.zeros_like(f_t)
            di = dc * c_hat * i_t * (1 - i_t)
            dc_hat = dc * i_t * (1 - c_hat ** 2)
            for grad in [do, dc, df, di, dc_hat]:
                np.clip(grad, -max_grad, max_grad, out=grad)
            self.Wf -= self.lr * np.clip(df @ concat.T, -max_grad, max_grad)
            self.Wi -= self.lr * np.clip(di @ concat.T, -max_grad, max_grad)
            self.Wc -= self.lr * np.clip(dc_hat @ concat.T, -max_grad, max_grad)
            self.Wo -= self.lr * np.clip(do @ concat.T, -max_grad, max_grad)
            self.bf -= self.lr * df
            self.bi -= self.lr * di
            self.bc -= self.lr * dc_hat
            self.bo -= self.lr * do
        return (pred - target) ** 2

    def predict(self, X_seq):
        pred, _, _ = self.forward_sequence(X_seq)
        return pred


# ════════════════════════════════════════════════════════════
# PER-MODEL PREDICTION FUNCTIONS
# Each returns: list of {date, day, predicted_max, predicted_min}
# ════════════════════════════════════════════════════════════

def predict_rf(X, y_max, y_min, temps_max, temps_min, end_date, window=7, forecast_days=7):
    """Random Forest predictions."""
    import time as _time
    t0 = _time.time()
    from sklearn.ensemble import RandomForestRegressor  # type: ignore[import]
    rf_max = RandomForestRegressor(n_estimators=50, random_state=42)
    rf_min = RandomForestRegressor(n_estimators=50, random_state=42)
    rf_max.fit(X, y_max)
    rf_min.fit(X, y_min)

    preds = []
    lw_max = np.array(temps_max[-window:]).reshape(1, -1)
    lw_min = np.array(temps_min[-window:]).reshape(1, -1)
    for day in range(forecast_days):
        pm = float(rf_max.predict(lw_max)[0])
        pn = float(rf_min.predict(lw_min)[0])
        preds.append({
            "date": (end_date + timedelta(days=day + 1)).strftime("%Y-%m-%d"),
            "day": (end_date + timedelta(days=day + 1)).strftime("%a"),
            "predicted_max": round(pm, 1),
            "predicted_min": round(pn, 1),
        })
        lw_max = np.append(lw_max[:, 1:], [[pm]], axis=1)
        lw_min = np.append(lw_min[:, 1:], [[pn]], axis=1)
    return preds, round((_time.time() - t0) * 1000)


def predict_xgb(X, y_max, y_min, temps_max, temps_min, end_date, window=7, forecast_days=7):
    """XGBoost predictions."""
    import time as _time
    t0 = _time.time()
    from xgboost import XGBRegressor  # type: ignore[import]
    xg_max = XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, verbosity=0)
    xg_min = XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, verbosity=0)
    xg_max.fit(X, y_max)
    xg_min.fit(X, y_min)

    preds = []
    lw_max = np.array(temps_max[-window:]).reshape(1, -1)
    lw_min = np.array(temps_min[-window:]).reshape(1, -1)
    for day in range(forecast_days):
        pm = float(xg_max.predict(lw_max)[0])
        pn = float(xg_min.predict(lw_min)[0])
        preds.append({
            "date": (end_date + timedelta(days=day + 1)).strftime("%Y-%m-%d"),
            "day": (end_date + timedelta(days=day + 1)).strftime("%a"),
            "predicted_max": round(pm, 1),
            "predicted_min": round(pn, 1),
        })
        lw_max = np.append(lw_max[:, 1:], [[pm]], axis=1)
        lw_min = np.append(lw_min[:, 1:], [[pn]], axis=1)
    return preds, round((_time.time() - t0) * 1000)


def predict_lgbm(X, y_max, y_min, temps_max, temps_min, end_date, window=7, forecast_days=7):
    """LightGBM predictions."""
    import time as _time
    t0 = _time.time()
    from lightgbm import LGBMRegressor  # type: ignore[import]
    lg_max = LGBMRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, verbose=-1)
    lg_min = LGBMRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, verbose=-1)
    lg_max.fit(X, y_max)
    lg_min.fit(X, y_min)

    preds = []
    lw_max = np.array(temps_max[-window:]).reshape(1, -1)
    lw_min = np.array(temps_min[-window:]).reshape(1, -1)
    for day in range(forecast_days):
        pm = float(lg_max.predict(lw_max)[0])
        pn = float(lg_min.predict(lw_min)[0])
        preds.append({
            "date": (end_date + timedelta(days=day + 1)).strftime("%Y-%m-%d"),
            "day": (end_date + timedelta(days=day + 1)).strftime("%a"),
            "predicted_max": round(pm, 1),
            "predicted_min": round(pn, 1),
        })
        lw_max = np.append(lw_max[:, 1:], [[pm]], axis=1)
        lw_min = np.append(lw_min[:, 1:], [[pn]], axis=1)
    return preds, round((_time.time() - t0) * 1000)


def predict_lstm(temps_max, temps_min, end_date, window=7, forecast_days=7, epochs=30):
    """LSTM (pure numpy) predictions."""
    import time as _time
    t0 = _time.time()

    all_max = np.array(temps_max)
    all_min = np.array(temps_min)
    mean_max, std_max = all_max.mean(), all_max.std() + 1e-8
    mean_min, std_min = all_min.mean(), all_min.std() + 1e-8
    norm_max = (all_max - mean_max) / std_max
    norm_min = (all_min - mean_min) / std_min

    # Prepare sequences
    X_tr_max, y_tr_max = [], []
    X_tr_min, y_tr_min = [], []
    for i in range(window, len(norm_max)):
        X_tr_max.append(norm_max[i - window:i])
        y_tr_max.append(norm_max[i])
    for i in range(window, len(norm_min)):
        X_tr_min.append(norm_min[i - window:i])
        y_tr_min.append(norm_min[i])

    # Train
    lstm_mx = NumpyLSTM(input_size=1, hidden_size=16, lr=0.003)
    lstm_mn = NumpyLSTM(input_size=1, hidden_size=16, lr=0.003)
    for _ in range(epochs):
        for j in range(len(X_tr_max)):
            lstm_mx.train_step(np.array(X_tr_max[j]).reshape(-1, 1), y_tr_max[j])
        for j in range(len(X_tr_min)):
            lstm_mn.train_step(np.array(X_tr_min[j]).reshape(-1, 1), y_tr_min[j])

    # Predict
    buf_max = norm_max[-window:].tolist()
    buf_min = norm_min[-window:].tolist()
    preds = []
    for day in range(forecast_days):
        pm_n = lstm_mx.predict(np.array(buf_max[-window:]).reshape(-1, 1))
        pn_n = lstm_mn.predict(np.array(buf_min[-window:]).reshape(-1, 1))
        pm = float(pm_n * std_max + mean_max)
        pn = float(pn_n * std_min + mean_min)
        preds.append({
            "date": (end_date + timedelta(days=day + 1)).strftime("%Y-%m-%d"),
            "day": (end_date + timedelta(days=day + 1)).strftime("%a"),
            "predicted_max": round(pm, 1),
            "predicted_min": round(pn, 1),
        })
        buf_max.append(pm_n)
        buf_min.append(pn_n)
    return preds, round((_time.time() - t0) * 1000)


# ════════════════════════════════════════════════════════════
# /predict — Single model prediction
# ════════════════════════════════════════════════════════════
@app.get("/predict")
def get_predict(model: str = "random_forest", days: int = 7):
    """
    ML-based temperature predictions for next N days.
    Models: random_forest, xgboost, lstm, lightgbm
    """
    try:
        td = fetch_training_data()
        temps_max, temps_min = td["temps_max"], td["temps_min"]
        end_date = td["end_date"]

        if len(temps_max) < 14:
            return {"error": "Insufficient data for prediction"}

        window = 7
        X, y_max, y_min = prepare_features(temps_max, temps_min, window)
        model_name = model.lower().replace(" ", "_")

        if model_name == "random_forest":
            predictions, time_ms = predict_rf(X, y_max, y_min, temps_max, temps_min, end_date, window, days)
        elif model_name == "xgboost":
            predictions, time_ms = predict_xgb(X, y_max, y_min, temps_max, temps_min, end_date, window, days)
        elif model_name == "lightgbm":
            predictions, time_ms = predict_lgbm(X, y_max, y_min, temps_max, temps_min, end_date, window, days)
        elif model_name == "lstm":
            predictions, time_ms = predict_lstm(temps_max, temps_min, end_date, window, days)
        else:
            return {"error": f"Unknown model: {model}. Use: random_forest, xgboost, lstm, lightgbm"}

        return {
            "model": model_name,
            "predictions": predictions,
            "training_days": td["training_days"],
            "training_time_ms": time_ms,
            "location": "Chennai, India",
        }
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════════════════════════════════
# /report — ENSEMBLE: All 4 models -> averaged final report
# ════════════════════════════════════════════════════════════
@app.get("/report")
def get_report(days: int = 7):
    """
    Ensemble prediction: runs all 4 models (Random Forest, XGBoost, LSTM, LightGBM),
    then averages predictions into a single unified report with confidence scores.

    Like the reference image: multiple streams -> one converged output.
    """
    try:
        # 1. Fetch data once (shared across all models)
        td = fetch_training_data()
        temps_max, temps_min = td["temps_max"], td["temps_min"]
        end_date = td["end_date"]

        if len(temps_max) < 14:
            return {"error": "Insufficient data for prediction"}

        window = 7
        X, y_max, y_min = prepare_features(temps_max, temps_min, window)

        # 2. Run all 4 models
        models_used = ["random_forest", "xgboost", "lstm", "lightgbm"]
        individual_results = {}
        all_preds = {}  # model -> predictions list

        # Random Forest
        try:
            preds, t_ms = predict_rf(X, y_max, y_min, temps_max, temps_min, end_date, window, days)
            individual_results["random_forest"] = {"predictions": preds, "training_time_ms": t_ms, "status": "success"}
            all_preds["random_forest"] = preds
        except Exception as e:
            individual_results["random_forest"] = {"status": "error", "error": str(e)}

        # XGBoost
        try:
            preds, t_ms = predict_xgb(X, y_max, y_min, temps_max, temps_min, end_date, window, days)
            individual_results["xgboost"] = {"predictions": preds, "training_time_ms": t_ms, "status": "success"}
            all_preds["xgboost"] = preds
        except Exception as e:
            individual_results["xgboost"] = {"status": "error", "error": str(e)}

        # LSTM
        try:
            preds, t_ms = predict_lstm(temps_max, temps_min, end_date, window, days)
            individual_results["lstm"] = {"predictions": preds, "training_time_ms": t_ms, "status": "success"}
            all_preds["lstm"] = preds
        except Exception as e:
            individual_results["lstm"] = {"status": "error", "error": str(e)}

        # LightGBM
        try:
            preds, t_ms = predict_lgbm(X, y_max, y_min, temps_max, temps_min, end_date, window, days)
            individual_results["lightgbm"] = {"predictions": preds, "training_time_ms": t_ms, "status": "success"}
            all_preds["lightgbm"] = preds
        except Exception as e:
            individual_results["lightgbm"] = {"status": "error", "error": str(e)}

        # 3. Compute ensemble average across all successful models
        successful_models = list(all_preds.keys())
        n_models = len(successful_models)

        if n_models == 0:
            return {"error": "All models failed"}

        final_predictions = []
        total_spread_max = 0
        total_spread_min = 0

        for day_idx in range(days):
            day_maxes = []
            day_mins = []
            for m in successful_models:
                if day_idx < len(all_preds[m]):
                    day_maxes.append(all_preds[m][day_idx]["predicted_max"])
                    day_mins.append(all_preds[m][day_idx]["predicted_min"])

            if not day_maxes:
                continue

            avg_max = round(sum(day_maxes) / len(day_maxes), 1)
            avg_min = round(sum(day_mins) / len(day_mins), 1)
            spread_max = round(max(day_maxes) - min(day_maxes), 1)
            spread_min = round(max(day_mins) - min(day_mins), 1)
            total_spread_max += spread_max
            total_spread_min += spread_min

            # Confidence based on model agreement (spread)
            avg_spread = (spread_max + spread_min) / 2
            if avg_spread < 1.0:
                confidence = "high"
            elif avg_spread < 2.0:
                confidence = "medium"
            else:
                confidence = "low"

            # Get date from first successful model
            ref = all_preds[successful_models[0]][day_idx]

            # Per-model breakdown for this day
            model_breakdown = {}
            for m in successful_models:
                if day_idx < len(all_preds[m]):
                    model_breakdown[m] = {
                        "max": all_preds[m][day_idx]["predicted_max"],
                        "min": all_preds[m][day_idx]["predicted_min"],
                    }

            final_predictions.append({
                "date": ref["date"],
                "day": ref["day"],
                "predicted_max": avg_max,
                "predicted_min": avg_min,
                "model_spread_max": spread_max,
                "model_spread_min": spread_min,
                "confidence": confidence,
                "per_model": model_breakdown,
            })

        # 4. Overall agreement score: 1 - (avg_spread / avg_temp)
        avg_temp = sum(p["predicted_max"] for p in final_predictions) / len(final_predictions) if final_predictions else 1
        avg_overall_spread = ((total_spread_max + total_spread_min) / 2) / len(final_predictions) if final_predictions else 0
        agreement_score = round(max(0, min(1, 1 - (avg_overall_spread / avg_temp))), 3)

        if agreement_score > 0.95:
            overall_confidence = "very_high"
        elif agreement_score > 0.90:
            overall_confidence = "high"
        elif agreement_score > 0.80:
            overall_confidence = "medium"
        else:
            overall_confidence = "low"

        total_time = sum(
            r.get("training_time_ms", 0) for r in individual_results.values() if isinstance(r, dict)
        )

        return {
            "query": f"{days}-day weather forecast",
            "models_used": successful_models,
            "models_failed": [m for m in models_used if m not in successful_models],
            "individual_results": individual_results,
            "final_report": {
                "predictions": final_predictions,
                "agreement_score": agreement_score,
                "overall_confidence": overall_confidence,
                "description": f"Ensemble average of {n_models} models. Agreement: {agreement_score:.1%}. Confidence: {overall_confidence}.",
            },
            "training_data": {
                "days": td["training_days"],
                "location": "Chennai, India",
                "total_compute_ms": total_time,
            },
        }
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════
# /earthquakes — Recent quakes from USGS
# ════════════════════════════════
@app.get("/earthquakes")
def get_earthquakes(min_magnitude: float = 4.5, days: int = 30):
    """Recent earthquakes from USGS."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    params = {
        "format": "geojson",
        "starttime": start_date.strftime("%Y-%m-%d"),
        "endtime": end_date.strftime("%Y-%m-%d"),
        "minmagnitude": min_magnitude,
        "orderby": "time",
        "limit": 1000,
    }

    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        features = data.get("features", [])
        events = []
        for f in features:
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [0, 0, 0])
            time_ms = props.get("time", 0)
            event_time = datetime.utcfromtimestamp(time_ms / 1000).isoformat() if time_ms else None

            events.append({
                "time": event_time,
                "magnitude": props.get("mag", 0),
                "place": props.get("place", "Unknown"),
                "longitude": coords[0] if len(coords) > 0 else 0,
                "latitude": coords[1] if len(coords) > 1 else 0,
                "depth_km": coords[2] if len(coords) > 2 else 0,
                "tsunami": props.get("tsunami", 0),
                "significance": props.get("sig", 0),
            })

        magnitudes = [float(e["magnitude"]) for e in events if e["magnitude"]]
        depths = [float(e["depth_km"]) for e in events if e["depth_km"]]

        return {
            "events": events,
            "summary": {
                "total": len(events),
                "max_magnitude": max(magnitudes) if magnitudes else 0,
                "avg_depth": round(float(sum(depths)) / len(depths), 1) if depths else 0.0,
                "m6_plus": len([m for m in magnitudes if m >= 6.0]),
                "tsunami_alerts": sum(1 for e in events if e["tsunami"]),
            },
        }
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════
# /cyclones — Historical Bay of Bengal cyclones
# ════════════════════════════════
@app.get("/cyclones")
def get_cyclones(year: int = None, name: str = None, min_wind: int = None):
    """Historical cyclone data for Chennai/Bay of Bengal (IBTrACS format compatible)."""
    
    # Base cyclone data (simulating IBTrACS format for tracks)
    cyclones = [
        {"name": "Cyclone Michaung", "year": 2023, "category": "Severe Cyclonic Storm", "max_wind_kmh": 100, "rainfall_mm": 450, "damage_crore": 8000, "dates": "Dec 1-5, 2023", "landfall": "Near Bapatla, AP", "impact": "Record 240mm rainfall, severe flooding, 17 deaths",
         "track": [
             {"lat":10.5,"lon":83, "wind_speed": 55, "pressure": 1002, "time": "2023-12-01T00:00:00Z"},
             {"lat":11,"lon":82.5, "wind_speed": 75, "pressure": 996, "time": "2023-12-02T00:00:00Z"},
             {"lat":12,"lon":81.5, "wind_speed": 90, "pressure": 988, "time": "2023-12-03T00:00:00Z"},
             {"lat":13,"lon":80.8, "wind_speed": 100, "pressure": 982, "time": "2023-12-04T00:00:00Z"},
             {"lat":14,"lon":80.5, "wind_speed": 85, "pressure": 990, "time": "2023-12-05T00:00:00Z"},
             {"lat":15.5,"lon":80.2, "wind_speed": 50, "pressure": 1000, "time": "2023-12-06T00:00:00Z"}
         ]},
        {"name": "Cyclone Mandous", "year": 2022, "category": "Cyclonic Storm", "max_wind_kmh": 85, "rainfall_mm": 180, "damage_crore": 1500, "dates": "Dec 6-12, 2022", "landfall": "Near Mahabalipuram, TN", "impact": "Heavy rainfall, power outages",
         "track": [
             {"lat":9,"lon":85, "wind_speed": 45, "pressure": 1004, "time": "2022-12-06T00:00:00Z"},
             {"lat":10,"lon":84, "wind_speed": 60, "pressure": 998, "time": "2022-12-07T00:00:00Z"},
             {"lat":11,"lon":83, "wind_speed": 75, "pressure": 992, "time": "2022-12-08T00:00:00Z"},
             {"lat":12,"lon":81.5, "wind_speed": 85, "pressure": 988, "time": "2022-12-09T00:00:00Z"},
             {"lat":12.5,"lon":80.5, "wind_speed": 65, "pressure": 996, "time": "2022-12-10T00:00:00Z"}
         ]},
        {"name": "Cyclone Nivar", "year": 2020, "category": "Very Severe", "max_wind_kmh": 130, "rainfall_mm": 350, "damage_crore": 3000, "dates": "Nov 23-27, 2020", "landfall": "Near Puducherry", "impact": "200mm+ rainfall, 12 deaths, airport closed",
         "track": [
             {"lat":8.5,"lon":86, "wind_speed": 60, "pressure": 1000, "time": "2020-11-23T00:00:00Z"},
             {"lat":9.5,"lon":84.5, "wind_speed": 90, "pressure": 992, "time": "2020-11-24T00:00:00Z"},
             {"lat":10.5,"lon":83, "wind_speed": 115, "pressure": 980, "time": "2020-11-25T00:00:00Z"},
             {"lat":11.5,"lon":81.5, "wind_speed": 130, "pressure": 974, "time": "2020-11-26T00:00:00Z"},
             {"lat":12,"lon":80.5, "wind_speed": 95, "pressure": 986, "time": "2020-11-27T00:00:00Z"}
         ]},
        {"name": "Cyclone Gaja", "year": 2018, "category": "Severe Cyclonic Storm", "max_wind_kmh": 120, "rainfall_mm": 200, "damage_crore": 15000, "dates": "Nov 11-19, 2018", "landfall": "Nagapattinam-Vedaranyam", "impact": "Schools closed, flights disrupted",
         "track": [
             {"lat":8,"lon":87, "wind_speed": 55, "pressure": 1002, "time": "2018-11-11T00:00:00Z"},
             {"lat":9,"lon":85.5, "wind_speed": 75, "pressure": 996, "time": "2018-11-13T00:00:00Z"},
             {"lat":10,"lon":83.5, "wind_speed": 100, "pressure": 986, "time": "2018-11-15T00:00:00Z"},
             {"lat":10.5,"lon":82, "wind_speed": 120, "pressure": 978, "time": "2018-11-16T00:00:00Z"},
             {"lat":10.8,"lon":80.5, "wind_speed": 85, "pressure": 992, "time": "2018-11-17T00:00:00Z"}
         ]},
        {"name": "Cyclone Vardah", "year": 2016, "category": "Very Severe", "max_wind_kmh": 140, "rainfall_mm": 150, "damage_crore": 5000, "dates": "Dec 6-13, 2016", "landfall": "Near Chennai", "impact": "Direct hit, 130km/h winds, 18 deaths, power out 3 days",
         "track": [
             {"lat":8,"lon":89, "wind_speed": 65, "pressure": 1000, "time": "2016-12-07T00:00:00Z"},
             {"lat":9.5,"lon":87, "wind_speed": 90, "pressure": 990, "time": "2016-12-09T00:00:00Z"},
             {"lat":11,"lon":85, "wind_speed": 115, "pressure": 982, "time": "2016-12-10T00:00:00Z"},
             {"lat":12,"lon":83, "wind_speed": 130, "pressure": 976, "time": "2016-12-11T00:00:00Z"},
             {"lat":13,"lon":81, "wind_speed": 140, "pressure": 970, "time": "2016-12-12T00:00:00Z"},
             {"lat":13.1,"lon":80.3, "wind_speed": 95, "pressure": 988, "time": "2016-12-13T00:00:00Z"}
         ]},
        {"name": "Cyclone Thane", "year": 2011, "category": "Very Severe", "max_wind_kmh": 140, "rainfall_mm": 120, "damage_crore": 2200, "dates": "Dec 25-31, 2011", "landfall": "Near Cuddalore", "impact": "Heavy rains, 48 deaths total",
         "track": [
             {"lat":8.5,"lon":88, "wind_speed": 55, "pressure": 1004, "time": "2011-12-25T00:00:00Z"},
             {"lat":9.5,"lon":86, "wind_speed": 75, "pressure": 996, "time": "2011-12-27T00:00:00Z"},
             {"lat":10.5,"lon":84, "wind_speed": 110, "pressure": 984, "time": "2011-12-28T00:00:00Z"},
             {"lat":11.5,"lon":82, "wind_speed": 140, "pressure": 972, "time": "2011-12-29T00:00:00Z"},
             {"lat":11.8,"lon":80, "wind_speed": 100, "pressure": 988, "time": "2011-12-30T00:00:00Z"}
         ]},
        {"name": "Cyclone Nisha", "year": 2008, "category": "Cyclonic Storm", "max_wind_kmh": 75, "rainfall_mm": 500, "damage_crore": 4500, "dates": "Nov 25-27, 2008", "landfall": "Near Karaikal", "impact": "500mm in 48hrs, worst flooding in decades",
         "track": [
             {"lat":8,"lon":84, "wind_speed": 45, "pressure": 1006, "time": "2008-11-25T00:00:00Z"},
             {"lat":9,"lon":82.5, "wind_speed": 60, "pressure": 998, "time": "2008-11-26T00:00:00Z"},
             {"lat":10,"lon":81, "wind_speed": 75, "pressure": 992, "time": "2008-11-27T00:00:00Z"},
             {"lat":10.5,"lon":80, "wind_speed": 55, "pressure": 1000, "time": "2008-11-28T00:00:00Z"}
         ]},
    ]
    
    # Filter processing
    if year is not None:
        cyclones = [c for c in cyclones if c["year"] == year]
    if name is not None:
        n_lower = name.lower()
        cyclones = [c for c in cyclones if n_lower in c["name"].lower()]
    if min_wind is not None:
        cyclones = [c for c in cyclones if c["max_wind_kmh"] >= min_wind]

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


# ════════════════════════════════
# /tsunamis — Historical Indian Ocean tsunamis
# ════════════════════════════════
@app.get("/tsunamis")
def get_tsunamis():
    """Historical tsunami events in the Indian Ocean."""
    events = [
        {"name": "Indian Ocean Tsunami", "date": "2004-12-26", "origin": "Off Sumatra", "lat": 3.316, "lon": 95.854, "magnitude": 9.1, "wave_height_m": 30.0, "fatalities": 227898, "description": "Deadliest tsunami. 9.1 earthquake triggered waves across Indian Ocean."},
        {"name": "Krakatoa Tsunami", "date": "1883-08-27", "origin": "Krakatoa, Sunda Strait", "lat": -6.102, "lon": 105.423, "magnitude": 0, "wave_height_m": 37.0, "fatalities": 36417, "description": "Volcanic eruption generated 37m waves."},
        {"name": "Makran Coast Tsunami", "date": "1945-11-28", "origin": "Makran Coast, Pakistan", "lat": 24.5, "lon": 63.0, "magnitude": 8.1, "wave_height_m": 13.0, "fatalities": 4000, "description": "Major tsunami from Makran subduction zone."},
        {"name": "Andaman Tsunami", "date": "1941-06-26", "origin": "Andaman Islands", "lat": 12.5, "lon": 92.5, "magnitude": 7.7, "wave_height_m": 1.5, "fatalities": 5000, "description": "Local tsunami affecting Andaman coastal communities."},
        {"name": "Sumatra Aftershock", "date": "2005-03-28", "origin": "Off Sumatra", "lat": 2.074, "lon": 97.013, "magnitude": 8.6, "wave_height_m": 3.0, "fatalities": 1313, "description": "Aftershock of 2004 event, tsunami warning across Indian Ocean."},
        {"name": "Sulawesi Tsunami", "date": "2018-09-28", "origin": "Sulawesi, Indonesia", "lat": -0.178, "lon": 119.84, "magnitude": 7.5, "wave_height_m": 11.0, "fatalities": 4340, "description": "11m waves struck Palu city."},
        {"name": "Anak Krakatau", "date": "2018-12-22", "origin": "Anak Krakatau volcano", "lat": -6.102, "lon": 105.423, "magnitude": 0, "wave_height_m": 5.0, "fatalities": 437, "description": "Volcanic flank collapse generated unexpected tsunami."},
        {"name": "Great Assam Earthquake", "date": "1950-08-15", "origin": "Assam-Tibet border", "lat": 28.5, "lon": 96.5, "magnitude": 8.6, "wave_height_m": 2.0, "fatalities": 1526, "description": "Massive flooding and river surges across Northeast India."},
    ]
    total_fatalities = sum(e["fatalities"] for e in events)
    return {
        "events": events,
        "summary": {
            "total": len(events),
            "max_wave": max(e["wave_height_m"] for e in events),
            "total_fatalities": total_fatalities,
            "period": "1883-2018",
        }
    }


# ════════════════════════════════
# /temperature-map — Global temperature grid for heatmap
# ════════════════════════════════

# Cache the temperature map so it's only computed once per server start
_temp_map_cache = None
_temp_map_timestamp = None

@app.get("/temperature-map")
def get_temperature_map():
    """High-fidelity temperature grid with land-masking and realistic climate simulation."""
    global _temp_map_cache, _temp_map_timestamp
    import random
    import math
    from fastapi.responses import JSONResponse

    # Return cached version if less than 1 hour old
    if _temp_map_cache and _temp_map_timestamp:
        age = (datetime.now() - _temp_map_timestamp).total_seconds()
        if age < 3600:
            return JSONResponse(
                content=_temp_map_cache,
                headers={"Access-Control-Allow-Origin": "*"}
            )

    try:
        # STEP = 3 gives ~7000 land points — dense enough for city-lights style heatmap
        STEP = 3
        all_points = []
        month = datetime.now().month

        def is_land(lat, lon):
            """Accurate land mask using continental bounding boxes."""
            if lat > 74 or lat < -57: return False
            # North America
            if 15 < lat < 72 and -168 < lon < -52: return True
            # South America
            if -56 < lat < 13 and -82 < lon < -34: return True
            # Europe
            if 36 < lat < 71 and -10 < lon < 40: return True
            # Africa
            if -35 < lat < 37 and -18 < lon < 52: return True
            # Middle East
            if 12 < lat < 42 and 32 < lon < 60: return True
            # Central/South Asia
            if 5 < lat < 38 and 60 < lon < 100: return True
            # East Asia
            if 20 < lat < 55 and 100 < lon < 145: return True
            # Southeast Asia
            if -10 < lat < 25 and 95 < lon < 141: return True
            # Russia/Siberia
            if 50 < lat < 74 and 40 < lon < 180: return True
            # Australia
            if -44 < lat < -10 and 112 < lon < 155: return True
            # Greenland
            if 60 < lat < 84 and -58 < lon < -17: return True
            # Japan/Korea islands
            if 30 < lat < 46 and 128 < lon < 146: return True
            # Scandinavia
            if 55 < lat < 72 and 4 < lon < 32: return True
            # UK/Ireland
            if 49 < lat < 61 and -11 < lon < 2: return True
            return False

        for lat in range(-56, 73, STEP):
            # Seasonal temperature peak shifts with month
            peak_lat = 12 * math.sin(math.radians((month - 3) * 30))
            base_temp = 30 - abs(lat - peak_lat) * 0.58

            for lon in range(-180, 180, STEP):
                if not is_land(lat, lon):
                    continue

                # Desert heat boost
                desert = 0
                if 15 < lat < 35 and -10 < lon < 60: desert = 8    # Sahara/Arabia
                elif 20 < lat < 40 and 40 < lon < 80: desert = 6   # Iran/Pakistan
                elif -35 < lat < -15 and 115 < lon < 140: desert = 7  # Australia outback
                elif 35 < lat < 50 and 60 < lon < 115: desert = 4   # Central Asia steppe

                # Mountain cooling
                mtn = 0
                if 25 < lat < 45 and 65 < lon < 105: mtn = -10  # Himalayas
                elif -35 < lat < 5 and -80 < lon < -65: mtn = -8   # Andes
                elif 35 < lat < 50 and -125 < lon < -105: mtn = -6  # Rockies
                elif 44 < lat < 48 and 5 < lon < 15: mtn = -7   # Alps
                elif 10 < lat < 20 and 35 < lon < 42: mtn = -5  # Ethiopian highlands

                # Tropical rainforest cooling
                jungle = 0
                if -15 < lat < 5 and -75 < lon < -45: jungle = -3   # Amazon
                if -5 < lat < 5 and 12 < lon < 30: jungle = -2       # Congo

                # Seasonal continental effect — interiors more extreme
                continental = 0
                if 45 < lat < 65 and 40 < lon < 130: continental = -6 * math.sin(math.radians((month - 7) * 30))

                noise = random.uniform(-1.8, 1.8)
                temp = base_temp + desert + mtn + jungle + continental + noise
                temp = max(-42, min(52, round(temp, 1)))

                all_points.append({"lat": lat, "lon": lon, "temp_c": temp})

        result = {
            "points": all_points,
            "count": len(all_points),
            "timestamp": datetime.now().isoformat(),
            "grid_step": STEP,
            "month": month,
            "status": "climate_model_v2"
        }

        # Cache the result
        _temp_map_cache = result
        _temp_map_timestamp = datetime.now()

        return JSONResponse(
            content=result,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Temperature map error: {str(e)}")
        # Ultimate fallback with minimal points to ensure visuals never "die"
        fallback_res = {
            "points": [{"lat": 13, "lon": 80, "temp_c": 30}],
            "count": 1,
            "error": str(e)
        }
        return JSONResponse(
            content=fallback_res,
            headers={"Access-Control-Allow-Origin": "*"}
        )


# ════════════════════════════════════════════════════════════
# /aqi — Air Quality Index for Chennai (OpenAQ)
# ════════════════════════════════════════════════════════════
@app.get("/aqi")
def get_aqi():
    """Fetch real AQI data for Chennai from Open-Meteo air quality API."""
    cached = _get_cache("aqi", 300)
    if cached: return cached
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi",
        "timezone": "Asia/Kolkata",
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        current = data.get("current", {})

        aqi = current.get("european_aqi", 0)

        # AQI category classification
        if aqi <= 20:
            category = "Good"
            color = "#22c55e"
            advice = "Air quality is excellent. Perfect for outdoor activities."
        elif aqi <= 40:
            category = "Fair"
            color = "#84cc16"
            advice = "Air quality is acceptable. Sensitive groups should take care."
        elif aqi <= 60:
            category = "Moderate"
            color = "#eab308"
            advice = "Moderate pollution. Limit prolonged outdoor exertion."
        elif aqi <= 80:
            category = "Poor"
            color = "#f97316"
            advice = "Poor air quality. Avoid outdoor activities if possible."
        elif aqi <= 100:
            category = "Very Poor"
            color = "#ef4444"
            advice = "Very poor air quality. Stay indoors and wear a mask outside."
        else:
            category = "Extremely Poor"
            color = "#7c3aed"
            advice = "Hazardous conditions. Avoid all outdoor activities."

        return {
            "aqi": aqi,
            "category": category,
            "color": color,
            "advice": advice,
            "pm2_5": current.get("pm2_5"),
            "pm10": current.get("pm10"),
            "nitrogen_dioxide": current.get("nitrogen_dioxide"),
            "ozone": current.get("ozone"),
            "carbon_monoxide": current.get("carbon_monoxide"),
        }
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════════════════════════════════
# /flood-risk — Flood Risk Score for Chennai
# ════════════════════════════════════════════════════════════
@app.get("/flood-risk")
def get_flood_risk():
    """Calculate flood risk score for Chennai based on rainfall, humidity, and forecast."""
    cached = _get_cache("flood_risk", 300)
    if cached: return cached
    try:
        # Fetch current weather
        weather_url = "https://api.open-meteo.com/v1/forecast"
        weather_params = {
            "latitude": LAT, "longitude": LON,
            "current": "precipitation,relative_humidity_2m,rain",
            "daily": "precipitation_sum,precipitation_probability_max",
            "forecast_days": 3,
            "timezone": "Asia/Kolkata",
        }
        r = requests.get(weather_url, params=weather_params, timeout=10)
        r.raise_for_status()
        data = r.json()
        current = data.get("current", {})
        daily = data.get("daily", {})

        # Flood risk factors
        current_rain = current.get("rain", 0) or 0
        current_precip = current.get("precipitation", 0) or 0
        humidity = current.get("relative_humidity_2m", 0) or 0
        precip_sums = daily.get("precipitation_sum", [0, 0, 0])
        precip_probs = daily.get("precipitation_probability_max", [0, 0, 0])

        total_forecast_rain = sum(p for p in precip_sums if p) 
        max_prob = max(p for p in precip_probs if p) if precip_probs else 0

        # Score calculation (0-100)
        score = 0
        score += min(current_rain * 5, 25)        # current rain (max 25pts)
        score += min(humidity * 0.2, 15)           # humidity (max 15pts)
        score += min(total_forecast_rain * 2, 30)  # 3-day forecast rain (max 30pts)
        score += min(max_prob * 0.3, 30)           # precipitation probability (max 30pts)

        # Chennai elevation factor — low lying city, higher base risk
        score = min(score * 1.15, 100)
        score = round(score)

        # Risk level
        if score <= 20:
            level = "Very Low"
            color = "#22c55e"
            advice = "No flood risk. Normal conditions."
            icon = "🟢"
        elif score <= 40:
            level = "Low"
            color = "#84cc16"
            advice = "Minor risk. Monitor rainfall forecasts."
            icon = "🟡"
        elif score <= 60:
            level = "Moderate"
            color = "#eab308"
            advice = "Moderate risk. Avoid low-lying areas during heavy rain."
            icon = "🟠"
        elif score <= 80:
            level = "High"
            color = "#f97316"
            advice = "High flood risk. Stay alert. Avoid underpasses and flood-prone zones."
            icon = "🔴"
        else:
            level = "Extreme"
            color = "#ef4444"
            advice = "Extreme flood risk! Stay indoors. Avoid all travel if possible."
            icon = "🚨"

        return {
            "score": score,
            "level": level,
            "color": color,
            "advice": advice,
            "icon": icon,
            "factors": {
                "current_rainfall_mm": round(current_rain, 1),
                "humidity_pct": humidity,
                "forecast_3day_mm": round(total_forecast_rain, 1),
                "max_precip_probability": max_prob,
            },
            "chennai_note": "Chennai is low-lying (6m ASL) with historically high flood vulnerability",
        }
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════════════════════════════════
# /seasonal — Seasonal Comparison for current month
# ════════════════════════════════════════════════════════════
@app.get("/seasonal")
def get_seasonal():
    """Compare current month's weather against historical averages (last 5 years)."""
    try:
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        # Fetch historical data for the same month over last 5 years
        yearly_data = []
        for year_offset in range(1, 6):
            year = current_year - year_offset
            month_start = datetime(year, current_month, 1)
            # Last day of month
            if current_month == 12:
                month_end = datetime(year, 12, 31)
            else:
                month_end = datetime(year, current_month + 1, 1) - timedelta(days=1)

            # Don't fetch future dates
            archive_limit = datetime.now() - timedelta(days=7)
            if month_end > archive_limit:
                month_end = archive_limit

            if month_start >= month_end:
                continue

            url = "https://archive-api.open-meteo.com/v1/archive"
            params = {
                "latitude": LAT, "longitude": LON,
                "start_date": month_start.strftime("%Y-%m-%d"),
                "end_date": month_end.strftime("%Y-%m-%d"),
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                "timezone": "Asia/Kolkata",
            }
            try:
                r = requests.get(url, params=params, timeout=15)
                r.raise_for_status()
                d = r.json().get("daily", {})
                temps_max = [t for t in d.get("temperature_2m_max", []) if t is not None]
                temps_min = [t for t in d.get("temperature_2m_min", []) if t is not None]
                precip = [p for p in d.get("precipitation_sum", []) if p is not None]
                if temps_max:
                    yearly_data.append({
                        "year": year,
                        "avg_max": round(sum(temps_max) / len(temps_max), 1),
                        "avg_min": round(sum(temps_min) / len(temps_min), 1) if temps_min else None,
                        "total_precip": round(sum(precip), 1) if precip else 0,
                    })
            except Exception:
                continue

        if not yearly_data:
            return {"error": "Could not fetch historical data"}

        # Calculate 5-year averages
        avg_max = round(sum(y["avg_max"] for y in yearly_data) / len(yearly_data), 1)
        avg_min = round(sum(y["avg_min"] for y in yearly_data if y["avg_min"]) / len(yearly_data), 1)
        avg_precip = round(sum(y["total_precip"] for y in yearly_data) / len(yearly_data), 1)

        # Fetch current month so far
        month_start_this_year = datetime(current_year, current_month, 1)
        current_month_end = min(now - timedelta(days=7), now)
        current_data = {"avg_max": None, "avg_min": None, "total_precip": None}

        if month_start_this_year < current_month_end:
            try:
                r = requests.get("https://archive-api.open-meteo.com/v1/archive", params={
                    "latitude": LAT, "longitude": LON,
                    "start_date": month_start_this_year.strftime("%Y-%m-%d"),
                    "end_date": (now - timedelta(days=7)).strftime("%Y-%m-%d"),
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                    "timezone": "Asia/Kolkata",
                }, timeout=15)
                r.raise_for_status()
                d = r.json().get("daily", {})
                tm = [t for t in d.get("temperature_2m_max", []) if t is not None]
                tn = [t for t in d.get("temperature_2m_min", []) if t is not None]
                pr = [p for p in d.get("precipitation_sum", []) if p is not None]
                if tm:
                    current_data = {
                        "avg_max": round(sum(tm) / len(tm), 1),
                        "avg_min": round(sum(tn) / len(tn), 1) if tn else None,
                        "total_precip": round(sum(pr), 1) if pr else 0,
                    }
            except Exception:
                pass

        month_name = now.strftime("%B")

        return {
            "month": month_name,
            "year": current_year,
            "current_month": current_data,
            "historical_avg": {
                "avg_max": avg_max,
                "avg_min": avg_min,
                "avg_precip": avg_precip,
                "based_on_years": len(yearly_data),
            },
            "yearly_breakdown": yearly_data,
            "comparison": {
                "temp_diff": round(current_data["avg_max"] - avg_max, 1) if current_data["avg_max"] else None,
                "precip_diff": round(current_data["total_precip"] - avg_precip, 1) if current_data["total_precip"] is not None else None,
                "is_hotter": current_data["avg_max"] > avg_max if current_data["avg_max"] else None,
                "is_wetter": current_data["total_precip"] > avg_precip if current_data["total_precip"] is not None else None,
            }
        }
    except Exception as e:
        return {"error": str(e)}


# ════════════════════════════════════════════════════════════
# /ask — INTELLIGENT QUERY ENGINE v2
# Understands dates, fetches precise data, focused answers.
# ════════════════════════════════════════════════════════════

import re as _re

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


def parse_date_from_query(query: str):
    """
    Extract a specific date from a natural language query.
    Supports:
      - '16 feb 2025', 'february 16, 2025', 'on Jan 10 2024'
      - '2025-02-16' (ISO), '16/02/2025' (DD/MM/YYYY)
      - 'yesterday', 'today', 'tomorrow'
      - 'last week', 'last month', 'last year'
      - '5 days ago', '3 weeks ago', '2 months ago', '1 year ago'
      - 'month YYYY' (e.g., 'march 2024' → March 1, 2024)
      - Bare year 'YYYY' (e.g., '2024' → Jan 1, 2024)
    Returns (datetime, date_type) or (None, None).
    date_type: 'specific_past', 'today', 'specific_future', 'relative_past', 'relative_future'
    """
    q = query.lower().strip()
    now = datetime.now()

    def classify(dt):
        if dt.date() < now.date():
            return "specific_past"
        elif dt.date() == now.date():
            return "today"
        else:
            return "specific_future"

    # ── Relative keywords ─────────────────────────────
    
    # Implement conversation context memory rules
    # "same date last year" / "this day last year" / "today vs last year"
    if any(p in q for p in ["same date", "same day", "this day", "today vs", "today versus"]):
        offset_years = 1  # default: 1 year back
        m = _re.search(r'(\d+)\s+years?\s+ago', q)
        if m:
            offset_years = int(m.group(1))
        elif "last year" in q or "previous year" in q:
            offset_years = 1
        try:
            dt = now.replace(year=now.year - offset_years)
        except ValueError:  # Feb 29 edge case
            dt = now.replace(year=now.year - offset_years, day=28)
        return dt, "relative_past"

    if "yesterday" in q:
        dt = now - timedelta(days=1)
        return dt, "relative_past"

    if "today" in q or "right now" in q or "current" in q:
        return now, "today"

    if "tomorrow" in q:
        dt = now + timedelta(days=1)
        return dt, "relative_future"

    # "N days/weeks/months/years ago"
    m = _re.search(r'(\d+)\s*(day|days|week|weeks|month|months|year|years)\s+ago', q)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        if "day" in unit:
            dt = now - timedelta(days=n)
        elif "week" in unit:
            dt = now - timedelta(weeks=n)
        elif "month" in unit:
            dt = now - timedelta(days=n * 30)
        elif "year" in unit:
            try:
                dt = now.replace(year=now.year - n)
            except ValueError:
                dt = now.replace(year=now.year - n, day=28)
        return dt, "relative_past"

    # "last week/month/year"
    if "last week" in q:
        dt = now - timedelta(days=7)
        return dt, "relative_past"
    if "last month" in q:
        dt = now - timedelta(days=30)
        return dt, "relative_past"
    if "last year" in q:
        # Preserve exact month/day — just subtract 1 year
        try:
            dt = now.replace(year=now.year - 1)
        except ValueError:
            dt = now.replace(year=now.year - 1, day=28)
        return dt, "relative_past"

    # "next week/month"
    if "next week" in q:
        dt = now + timedelta(days=7)
        return dt, "relative_future"
    if "next month" in q:
        dt = now + timedelta(days=30)
        return dt, "relative_future"

    # ── Explicit date patterns ────────────────────────

    # Pattern: "DD month YYYY" (e.g., "16 feb 2025", "on 10 jan 2024")
    m = _re.search(r'(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s*,?\s*(\d{4})', q)
    if m:
        day, month_str, year = int(m.group(1)), m.group(2), int(m.group(3))
        month = MONTH_MAP.get(month_str)
        if month:
            try:
                dt = datetime(year, month, day)
                return dt, classify(dt)
            except ValueError:
                pass

    # Pattern: "month DD YYYY" (e.g., "february 16, 2025", "jan 10 2024")
    m = _re.search(r'(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})\s*,?\s*(\d{4})', q)
    if m:
        month_str, day, year = m.group(1), int(m.group(2)), int(m.group(3))
        month = MONTH_MAP.get(month_str)
        if month:
            try:
                dt = datetime(year, month, day)
                return dt, classify(dt)
            except ValueError:
                pass

    # Pattern: "YYYY-MM-DD" (ISO format)
    m = _re.search(r'(\d{4})-(\d{2})-(\d{2})', q)
    if m:
        try:
            dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            last_date = dt
            return dt, classify(dt)
        except ValueError:
            pass

    # Pattern: "DD/MM/YYYY" or "DD-MM-YYYY" (common Indian format)
    m = _re.search(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', q)
    if m:
        a, b, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        # Try DD/MM/YYYY first (India)
        try:
            dt = datetime(year, b, a)
            last_date = dt
            return dt, classify(dt)
        except ValueError:
            try:
                dt = datetime(year, a, b)
                return dt, classify(dt)
            except ValueError:
                pass

    # Pattern: "month YYYY" (e.g., "march 2024" → defaults to 1st of month)
    m = _re.search(r'(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{4})', q)
    if m:
        month_str, year = m.group(1), int(m.group(2))
        month = MONTH_MAP.get(month_str)
        if month:
            try:
                dt = datetime(year, month, 1)
                return dt, classify(dt)
            except ValueError:
                pass

    # Pattern: bare "YYYY" — just a year like "2024" or "in 2023"
    # Must be 4 digits, between 1900-2100, not part of a longer number/date
    m = _re.search(r'(?<!\d)(?<!\d[-/])(19\d{2}|20\d{2})(?![-/]\d)(?!\d)', q)
    if m:
        year = int(m.group(1))
        # Don't match the current year as a specific date (it's ambiguous)
        if year != now.year:
            dt = datetime(year, 1, 1)
            last_date = dt
            return dt, classify(dt)

    return None, None


def parse_days_from_query(query: str, default: int = 7) -> int:
    """Extract number of forecast days from query. Ignores 'N days ago' patterns."""
    q = query.lower()
    # Don't match "N days ago" — that's handled by date parsing
    m = _re.search(r'(\d+)\s*day(?:s)?(?!\s+ago)', q)
    return int(m.group(1)) if m else default


def fetch_historical_weather(target_date: datetime, days_range: int = 1):
    """
    Fetch actual historical weather data from Open-Meteo Archive API
    for a specific date or date range.
    """
    start = target_date
    end = target_date + timedelta(days=days_range - 1)

    # Archive API lags ~5-7 days, check if date is available
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

        # Extract hourly for the target date
        hourly_data = []
        for i, t in enumerate(hourly.get("time", [])):
            hourly_data.append({
                "time": t,
                "temperature": hourly.get("temperature_2m", [None])[i] if i < len(hourly.get("temperature_2m", [])) else None,
                "humidity": hourly.get("relative_humidity_2m", [None])[i] if i < len(hourly.get("relative_humidity_2m", [])) else None,
                "wind_speed": hourly.get("wind_speed_10m", [None])[i] if i < len(hourly.get("wind_speed_10m", [])) else None,
                "cloud_cover": hourly.get("cloud_cover", [None])[i] if i < len(hourly.get("cloud_cover", [])) else None,
                "precipitation": hourly.get("precipitation", [0])[i] if i < len(hourly.get("precipitation", [])) else 0,
            })

        return {"daily": days_data, "hourly": hourly_data, "source": "Open-Meteo Archive API"}
    except Exception as e:
        return {"error": str(e)}


def classify_query(query: str):
    """
    Classify query into granular intent categories.
    Uses sub-intents to distinguish data retrieval from prediction.
    Returns list of intents from:
      weather_current, weather_history, prediction,
      cyclone_history, cyclone_prediction,
      earthquake, tsunami, disaster
    """
    q = query.lower().strip()
    intents = []

    # ── Detect time orientation (past vs future) ──
    past_kw = ["last year", "previous", "history", "historical", "ago", "past",
               "same date", "same day", "this day", "yesterday", "back in",
               "was", "were", "happened", "occurred", "hit", "struck", "recent"]
    future_kw = ["predict", "prediction", "next", "forecast", "tomorrow",
                 "coming", "upcoming", "expect", "will", "probability",
                 "chance", "future", "model", "ml", "ai"]
    
    is_past = any(k in q for k in past_kw)
    is_future = any(k in q for k in future_kw)

    # ── Weather ──
    weather_kw = ["weather", "temperature", "temp", "hot", "cold", "rain", "wind", "humidity",
                  "climate", "heat", "sunny", "cloudy", "precipitation", "pressure",
                  "detail", "condition", "report"]
    if any(k in q for k in weather_kw):
        if is_past:
            intents.append("weather_history")
        elif is_future:
            intents.append("prediction")
        else:
            intents.append("weather")   # current by default

    # ── Cyclone ──
    cyclone_kw = ["cyclone", "hurricane", "typhoon", "storm", "wind storm", "tropical",
                  "bay of bengal", "vardah", "nivar", "gaja", "mandous", "michaung",
                  "thane", "nisha", "fani", "amphan", "hudhud"]
    if any(k in q for k in cyclone_kw):
        if is_future:
            intents.append("cyclone_prediction")
        else:
            intents.append("cyclone")   # history/data retrieval

    # ── Earthquake ──
    quake_kw = ["earthquake", "quake", "seismic", "magnitude", "richter", "tremor",
                "tectonic", "fault", "aftershock", "usgs"]
    if any(k in q for k in quake_kw):
        intents.append("earthquake")

    # ── Tsunami ──
    tsunami_kw = ["tsunami", "tidal wave", "ocean wave", "indian ocean", "sumatra",
                  "krakatoa", "sulawesi", "wave height"]
    if any(k in q for k in tsunami_kw):
        intents.append("tsunami")

    # ── Pure prediction (no specific domain) ──
    if not intents and is_future:
        intents.append("prediction")

    # ── Disaster overview ──
    disaster_kw = ["disaster", "catastrophe", "calamity", "danger", "risk",
                   "overview", "summary", "all"]
    if any(k in q for k in disaster_kw):
        intents.append("disaster")

    # Default: current weather
    if not intents:
        intents = ["weather"]

    return list(set(intents))


# ── Known cyclone names for query context extraction ──
KNOWN_CYCLONES = ["michaung", "mandous", "nivar", "gaja", "vardah", "thane", "nisha",
                  "fani", "amphan", "hudhud", "phailin", "laila", "jal"]

KNOWN_LOCATIONS = ["chennai", "mumbai", "kolkata", "vizag", "visakhapatnam",
                   "bay of bengal", "arabian sea", "tamil nadu", "andhra pradesh",
                   "odisha", "west bengal", "india", "puducherry", "cuddalore",
                   "nagapattinam", "mahabalipuram"]


def extract_query_context(query: str):
    """
    Extract structured context from a natural-language query:
      - cyclone_name: specific cyclone mentioned (e.g. "gaja")
      - year: specific year mentioned
      - location: specific location mentioned
      - wants_recent: whether user wants "recent" / "latest" data
      - wants_comparison: whether user wants a comparison ("vs", "compared to")
    """
    q = query.lower().strip()

    # Extract cyclone name
    cyclone_name = None
    for name in KNOWN_CYCLONES:
        if name in q:
            cyclone_name = name
            break

    # Extract year (4-digit, 1900-2099)
    year = None
    m = _re.search(r'(?<!\d)(?<!\d[-/])(19\d{2}|20\d{2})(?![-/]\d)(?!\d)', q)
    if m:
        year = int(m.group(1))

    # Extract location
    location = None
    for loc in KNOWN_LOCATIONS:
        if loc in q:
            location = loc
            break

    # Detect modifiers
    wants_recent = any(k in q for k in ["recent", "latest", "last", "newest", "most recent"])
    wants_comparison = any(k in q for k in [" vs ", "versus", "compared to", "compare",
                                             "difference between", "today vs"])

    return {
        "cyclone_name": cyclone_name,
        "year": year,
        "location": location,
        "wants_recent": wants_recent,
        "wants_comparison": wants_comparison,
    }


def build_focused_analysis(query, intents, data_sources, target_date, date_type):
    """
    Build a detailed, structured analysis that DIRECTLY answers the question.
    Produces multi-line, human-readable summaries instead of one-liners.
    """
    lines = []
    now = datetime.now()

    # ── Historical weather for specific date ──
    if "historical_weather" in data_sources and data_sources["historical_weather"]:
        hw = data_sources["historical_weather"]
        if "error" not in hw and hw.get("daily"):
            target_str = target_date.strftime("%Y-%m-%d") if target_date else hw["daily"][0]["date"]
            target_data = next((d for d in hw["daily"] if d["date"] == target_str), hw["daily"][0])
            dt = datetime.strptime(target_data["date"], "%Y-%m-%d")
            
            summary = (
                f"{dt.strftime('%B %d %Y')} – Chennai\n"
                f"Max Temp: {target_data['temp_max']}°C\n"
                f"Min Temp: {target_data['temp_min']}°C\n"
                f"Rain: {target_data['precipitation']} mm\n"
                f"Wind: {target_data['wind_speed_max']} km/h"
            )
            lines.append(summary)

            # If there's also current weather data, add comparison
            if "weather" in data_sources and data_sources["weather"]:
                w = data_sources["weather"]
                if "error" not in w:
                    lines.append(
                        f"\nToday ({now.strftime('%B %d %Y')}) for comparison:\n"
                        f"Current Temp: {w.get('temperature')}°C\n"
                        f"Wind: {w.get('wind_speed')} km/h\n"
                        f"Humidity: {w.get('humidity')}%\n"
                        f"Temp difference: {round(w.get('temperature', 0) - (target_data['temp_max'] or 0), 1)}°C vs last year's max"
                    )
        elif hw.get("error"):
            lines.append(f"Could not fetch historical data: {hw['error']}")

    # ── Current weather (only if no historical comparison already added) ──
    elif "weather" in data_sources and data_sources["weather"]:
        w = data_sources["weather"]
        if "error" not in w:
            if date_type == "today" or target_date is None:
                summary = (
                    f"Current Weather – Chennai ({now.strftime('%B %d %Y, %H:%M')})\n"
                    f"Temperature: {w.get('temperature')}°C\n"
                    f"Wind Speed: {w.get('wind_speed')} km/h\n"
                    f"Wind Direction: {w.get('wind_direction', 'N/A')}°\n"
                    f"Humidity: {w.get('humidity')}%\n"
                    f"Conditions: {w.get('description', 'N/A')}"
                )
                lines.append(summary)

    # ── Forecast ──
    if "forecast" in data_sources and data_sources["forecast"]:
        fc = data_sources["forecast"]
        if "error" not in fc and fc.get("daily"):
            if target_date and date_type == "specific_future":
                target_str = target_date.strftime("%Y-%m-%d")
                found = False
                for d in fc["daily"]:
                    if d["date"] == target_str:
                        dt = datetime.strptime(d["date"], "%Y-%m-%d")
                        summary = (
                            f"Forecast for {dt.strftime('%B %d %Y')} ({dt.strftime('%A')}) – Chennai\n"
                            f"Max Temp: {d['temp_max']}°C\n"
                            f"Min Temp: {d['temp_min']}°C\n"
                            f"Rain: {d['precipitation']} mm\n"
                            f"Wind: {d['wind_speed_max']} km/h"
                        )
                        lines.append(summary)
                        found = True
                        break
                if not found:
                    days_ahead = (target_date.date() - now.date()).days
                    lines.append(
                        f"The date {target_str} is {days_ahead} days ahead, beyond the 7-day forecast range. "
                        f"Running ML models for extended prediction."
                    )
            elif not target_date or date_type == "today":
                d = fc["daily"][0]
                dt = datetime.strptime(d["date"], "%Y-%m-%d")
                summary = (
                    f"Today's Forecast ({dt.strftime('%A, %B %d %Y')}) – Chennai\n"
                    f"Max Temp: {d['temp_max']}°C\n"
                    f"Min Temp: {d['temp_min']}°C\n"
                    f"Rain: {d['precipitation']} mm\n"
                    f"Wind: {d['wind_speed_max']} km/h"
                )
                lines.append(summary)

    # ── Earthquakes ──
    if "earthquake" in data_sources and data_sources["earthquake"]:
        eq = data_sources["earthquake"]
        if "error" not in eq:
            summary = eq.get("summary", {})
            event_list = eq.get("events", [])
            lines.append(
                f"Seismic Activity Report (Last 30 days)\n"
                f"Total Events: {summary.get('total', 0)} earthquakes (M4.5+)\n"
                f"Strongest: M{summary.get('max_magnitude', '?')}\n"
                f"Average Depth: {summary.get('avg_depth', '?')} km\n"
                f"M6+ Events: {summary.get('m6_plus', 0)}\n"
                f"Tsunami Alerts: {summary.get('tsunami_alerts', 0)}"
            )

    # ── Cyclones — DETAILED listing ──
    if "cyclone" in data_sources and data_sources["cyclone"]:
        cy = data_sources["cyclone"]
        if "error" not in cy:
            cyclone_list = cy.get("cyclones", [])
            summary = cy.get("summary", {})
            
            if cyclone_list:
                header = f"Cyclone Records – Bay of Bengal ({summary.get('period', '')})\nTotal: {summary.get('total', 0)} cyclones | Avg Wind: {summary.get('avg_wind', '?')} km/h\n"
                lines.append(header)
                
                # List each cyclone with details
                for i, c in enumerate(cyclone_list, 1):
                    detail = (
                        f"{i}. {c['name']} ({c['year']})\n"
                        f"   Category: {c['category']}\n"
                        f"   Max Wind: {c['max_wind_kmh']} km/h\n"
                        f"   Rainfall: {c['rainfall_mm']} mm\n"
                        f"   Dates: {c['dates']}\n"
                        f"   Landfall: {c['landfall']}\n"
                        f"   Impact: {c['impact']}\n"
                        f"   Damage: ₹{c['damage_crore']} crore"
                    )
                    lines.append(detail)
            else:
                lines.append("No cyclone records found matching your query.")

    # ── Tsunamis ──
    if "tsunami" in data_sources and data_sources["tsunami"]:
        ts = data_sources["tsunami"]
        if "error" not in ts:
            summary = ts.get("summary", {})
            event_list = ts.get("events", [])
            lines.append(
                f"Tsunami Records – Indian Ocean ({summary.get('period', '')})\n"
                f"Total Events: {summary.get('total', 0)}\n"
                f"Max Wave Height: {summary.get('max_wave', '?')}m"
            )

    # ── ML Ensemble ──
    if "ensemble" in data_sources and data_sources["ensemble"]:
        ens = data_sources["ensemble"]
        if "error" not in ens:
            report = ens.get("final_report", {})
            preds = report.get("predictions", [])
            if preds:
                if target_date and date_type == "specific_future":
                    target_str = target_date.strftime("%Y-%m-%d")
                    for p in preds:
                        if p["date"] == target_str:
                            lines.append(
                                f"ML PREDICTION for {target_str}:\n"
                                f"Predicted Max: {p['predicted_max']}°C\n"
                                f"Predicted Min: {p['predicted_min']}°C\n"
                                f"Model Spread: ±{p['model_spread_max']}°C\n"
                                f"Confidence: {p['confidence'].upper()}"
                            )
                            break
                else:
                    temps_max = [p["predicted_max"] for p in preds]
                    temps_min = [p["predicted_min"] for p in preds]
                    lines.append(
                        f"ML PREDICTION ({len(preds)} days ahead):\n"
                        f"Max Range: {min(temps_max)}-{max(temps_max)}°C\n"
                        f"Min Range: {min(temps_min)}-{max(temps_min)}°C\n"
                        f"Model Agreement: {report.get('agreement_score', 0)*100:.1f}%\n"
                        f"Confidence: {report.get('overall_confidence', 'unknown').upper()}\n"
                        f"Models used: {', '.join(ens.get('models_used', []))}"
                    )

    if not lines:
        lines.append(
            "I analyzed the available data but couldn't find specific information for your query. "
            "Try asking about weather on a specific date, earthquakes, cyclones, tsunamis, or predictions."
        )

    return "\n".join(lines)


@app.get("/ask")
def ask_climai(q: str = "weather today"):
    """
    Main entry point for AI analysis.
    Orchestrates Planner -> Executor -> Ensemble -> Groq Synthesis.
    """
    start_time = datetime.now()
    print(f"DEBUG: /ask called with q='{q}'")
    import time as _time
    import re
    t0 = _time.time()

    query = q.strip()
    
    # ── 1. PLAN ──
    plan = plan_query(query)
    intents = plan["all_intents"]
    target_date = plan["date"]
    ctx = plan["context"]
    
    # Extract relative days if mentioned 
    days = 7
    m = re.search(r'(\d+)\s*(days|weeks|months|years)', query)
    if m:
        val, unit = int(m.group(1)), m.group(2)
        days = val if unit.startswith("day") else val*7 if unit.startswith("week") else val*30 if unit.startswith("month") else val*365

    # Default date_type to support legacy build_focused_analysis
    date_type = "specific_past" if target_date and target_date < datetime.utcnow().date() else "specific_future" if target_date else "today"
    
    steps = []
    errors = []
    models_status = {}
    now = datetime.now()

    steps.append({
        "step": "plan",
        "status": "done",
        "detail": f"Intents: {', '.join(intents)} | Date: {target_date.strftime('%Y-%m-%d') if target_date else 'None'}"
    })

    # ── 2. EXECUTE ──
    steps.append({"step": "execute", "status": "running", "detail": "Executing data retrieval plan..."})
    try:
        data_sources = execute_plan(plan)
        # Drop None keys to match legacy behavior
        data_sources = {k: v for k, v in data_sources.items() if v is not None}
        steps[-1]["status"] = "done"
    except Exception as e:
        data_sources = {}
        steps[-1]["status"] = "error"
        errors.append(f"Executor failed: {str(e)}")

    # ── 3. LOCAL ML ORCHESTRATION ──
    # NEVER run ML for pure data retrieval intents
    run_models = False
    data_only_intents = {"cyclone", "earthquake", "tsunami", "weather_history", "disaster"}
    is_data_only = all(i in data_only_intents for i in intents)
    is_past_date = target_date and date_type in ("specific_past", "relative_past")

    if not is_past_date and not is_data_only:
        if "prediction" in intents:
            run_models = True
        if target_date and date_type in ("specific_future", "relative_future"):
            days_ahead = (target_date - now.date()).days
            if days_ahead > 7:
                run_models = True
                days = max(days, days_ahead)
        if not target_date and "weather" in intents and "prediction" not in intents:
            run_models = False

    if run_models:
        steps.append({"step": "ensemble", "status": "running", "detail": "Running 4 ML models as team..."})
        try:
            td = fetch_training_data()
            temps_max, temps_min = td["temps_max"], td["temps_min"]
            end_date = td["end_date"]
            window = 7
            X, y_max, y_min = prepare_features(temps_max, temps_min, window)

            all_preds = {}
            individual_results = {}
            model_funcs = {
                "random_forest": lambda: predict_rf(X, y_max, y_min, temps_max, temps_min, end_date, window, days),
                "xgboost": lambda: predict_xgb(X, y_max, y_min, temps_max, temps_min, end_date, window, days),
                "lstm": lambda: predict_lstm(temps_max, temps_min, end_date, window, days),
                "lightgbm": lambda: predict_lgbm(X, y_max, y_min, temps_max, temps_min, end_date, window, days),
            }

            for model_name, model_fn in model_funcs.items():
                try:
                    preds, t_ms = model_fn()
                    models_status[model_name] = {"status": "success", "time_ms": t_ms}
                    individual_results[model_name] = {"predictions": preds, "training_time_ms": t_ms, "status": "success"}
                    all_preds[model_name] = preds
                except Exception as e:
                    models_status[model_name] = {"status": "error", "error": str(e)}
                    individual_results[model_name] = {"status": "error", "error": str(e)}
                    errors.append(f"{model_name} failed: {str(e)}")

            successful_models = list(all_preds.keys())
            n_models = len(successful_models)

            if n_models > 0:
                final_predictions = []
                total_spread_max = 0
                total_spread_min = 0

                for day_idx in range(days):
                    day_maxes = [all_preds[m][day_idx]["predicted_max"] for m in successful_models if day_idx < len(all_preds[m])]
                    day_mins = [all_preds[m][day_idx]["predicted_min"] for m in successful_models if day_idx < len(all_preds[m])]
                    if not day_maxes:
                        continue

                    avg_max = round(sum(day_maxes) / len(day_maxes), 1)
                    avg_min = round(sum(day_mins) / len(day_mins), 1)
                    spread_max = round(max(day_maxes) - min(day_maxes), 1)
                    spread_min = round(max(day_mins) - min(day_mins), 1)
                    total_spread_max += spread_max
                    total_spread_min += spread_min
                    avg_spread = (spread_max + spread_min) / 2
                    confidence = "high" if avg_spread < 1.0 else "medium" if avg_spread < 2.0 else "low"
                    ref = all_preds[successful_models[0]][day_idx]

                    model_breakdown = {}
                    for m in successful_models:
                        if day_idx < len(all_preds[m]):
                            model_breakdown[m] = {"max": all_preds[m][day_idx]["predicted_max"], "min": all_preds[m][day_idx]["predicted_min"]}

                    final_predictions.append({
                        "date": ref["date"], "day": ref["day"],
                        "predicted_max": avg_max, "predicted_min": avg_min,
                        "model_spread_max": spread_max, "model_spread_min": spread_min,
                        "confidence": confidence, "per_model": model_breakdown,
                    })

                avg_temp = sum(p["predicted_max"] for p in final_predictions) / len(final_predictions) if final_predictions else 1
                avg_overall_spread = ((total_spread_max + total_spread_min) / 2) / len(final_predictions) if final_predictions else 0
                agreement_score = round(max(0, min(1, 1 - (avg_overall_spread / avg_temp))), 3)
                overall_confidence = "very_high" if agreement_score > 0.95 else "high" if agreement_score > 0.90 else "medium" if agreement_score > 0.80 else "low"
                total_time = sum(r.get("time_ms", 0) for r in models_status.values() if isinstance(r, dict) and r.get("status") == "success")

                data_sources["ensemble"] = {
                    "models_used": successful_models,
                    "models_failed": [m for m in model_funcs if m not in successful_models],
                    "individual_results": individual_results,
                    "final_report": {"predictions": final_predictions, "agreement_score": agreement_score, "overall_confidence": overall_confidence},
                    "training_data": {"days": td["training_days"], "total_compute_ms": total_time},
                }
                steps[-1]["status"] = "done"
                steps[-1]["detail"] = f"{n_models}/4 models succeeded"
            else:
                steps[-1]["status"] = "error"
                steps[-1]["detail"] = "All models failed"
        except Exception as e:
            steps[-1]["status"] = "error"
            errors.append(f"Ensemble failed: {str(e)}")

    # ── 4. CRITIC ──
    checked = review(query, plan, data_sources)
    corrections = checked["corrections"]
    is_valid = checked["is_valid"]
    
    if corrections:
        steps.append({"step": "critic", "status": "error" if not is_valid else "done", 
                      "detail": f"Self-Healed/Detected: {', '.join(corrections)}"})

    log({"query": query, "plan": plan, "corrections": corrections, "valid": is_valid})

    # ── 5. SYNTHESIZE ANALYSIS ──
    analysis = groq_answer(query, intents, data_sources, target_date, date_type)
    if not is_valid:
        analysis += "\n\n(Note: The AI self-critic noted missing or skewed data constraints during processing.)"

    total_time_ms = round((_time.time() - t0) * 1000)

    return {
        "query": query,
        "intents": intents,
        "target_date": target_date.strftime("%Y-%m-%d") if target_date else None,
        "date_type": date_type,
        "steps": steps,
        "models": models_status,
        "data": data_sources,
        "analysis": analysis,
        "corrections": corrections,
        "errors": errors,
        "total_time_ms": total_time_ms,
    }



if __name__ == "__main__":
    import uvicorn  # type: ignore[import]
    uvicorn.run(app, host="0.0.0.0", port=8000)