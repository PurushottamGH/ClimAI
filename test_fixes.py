import sys
import numpy as np
from datetime import datetime
sys.path.insert(0, 'backend')

print('--- Test 1 ---')
from main import fetch_training_data
td = fetch_training_data()
assert td['training_days'] > 1000, f'Expected >1000 days, got {td["training_days"]}'
assert td['source'] == 'saved_dataset', 'Not using saved dataset!'
print(f'OK: {td["training_days"]} training days from {td["source"]}')

print('--- Test 2 ---')
from groq_llm import _build_context_block
ctx = _build_context_block()
assert 'None' not in ctx or ctx.count('None') < 3, 'Too many None values in context'
assert len(ctx) > 500, 'Context block too short — keys still missing'
print('OK: context block length =', len(ctx))
print(ctx[:300])

print('--- Test 3 ---')
from main import prepare_features, predict_lstm
preds, ms = predict_lstm(td['temps_max'], td['temps_min'], td['end_date'], window=7, forecast_days=3)
assert len(preds) == 3
for p in preds:
    assert 20 < p['predicted_max'] < 50, f'Unrealistic max temp: {p}'
    assert 15 < p['predicted_min'] < 40, f'Unrealistic min temp: {p}'
print('OK: LSTM predictions:', preds)

print('--- Test 4 ---')
from main import predict_rf, _model_cache
X, ym, yn = prepare_features(td['temps_max'], td['temps_min'], 7)
predict_rf(X, ym, yn, td['temps_max'], td['temps_min'], datetime.now())
key = f'rf_{len(td["temps_max"])}'
assert key in _model_cache, 'RF model not cached!'
print('OK: model cache working, key =', key)
