"""Tests for backend/critic.py — the self-healing review pass.

The critic flags data problems that the LLM answer builder should mention,
and its is_valid flag gates the "data constraints" disclaimer appended to
the final analysis.
"""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from critic import review


class ReviewTests(unittest.TestCase):
    def test_valid_data_no_corrections(self):
        result = review("weather tomorrow", {"date": None}, {"weather": {"temp": 30}})
        self.assertEqual(result["corrections"], [])
        self.assertTrue(result["is_valid"])

    def test_missing_data_invalidates(self):
        result = review("weather", {"date": None}, None)
        self.assertIn("data_missing", result["corrections"])
        self.assertFalse(result["is_valid"])

    def test_jan_first_default_with_month_hint(self):
        plan = {"date": date(2024, 1, 1)}
        result = review("weather in february 2024", plan, {"weather": {}})
        self.assertIn("date_reparsed_from_jan1_default", result["corrections"])

    def test_jan_first_without_month_hint_stays_clean(self):
        plan = {"date": date(2024, 1, 1)}
        result = review("weather in 2024", plan, {"weather": {}})
        self.assertNotIn("date_reparsed_from_jan1_default", result["corrections"])

    def test_failed_model_flags_fallback(self):
        raw = {"models": {"lstm": {"status": "error"}, "random_forest": {"status": "success"}}}
        result = review("predict next week", {"date": None}, raw)
        self.assertIn("fallback_triggered_for_lstm", result["corrections"])
        self.assertNotIn("fallback_triggered_for_random_forest", result["corrections"])

    def test_empty_arrays_flagged(self):
        raw = {"weather": {"daily": {"time": []}}}
        result = review("weather", {"date": None}, raw)
        self.assertIn("open_meteo_returned_empty_arrays", result["corrections"])

    def test_weather_without_daily_key_not_flagged(self):
        raw = {"weather": {"temperature": 30}}
        result = review("weather", {"date": None}, raw)
        self.assertNotIn("open_meteo_returned_empty_arrays", result["corrections"])


if __name__ == "__main__":
    unittest.main()
