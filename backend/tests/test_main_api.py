"""Tests for backend/main.py API endpoints — response shaping over mocked upstreams.

The real Open-Meteo/USGS calls are replaced so the shape contracts the frontend
depends on (wind direction names, ragged-array tolerance, error envelopes) are
checked deterministically.
"""

import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import main


class WeatherEndpointTests(unittest.TestCase):
    def setUp(self):
        main._cache.clear()
        main._cache_ttl.clear()

    def _fake_response(self, payload):
        response = mock.Mock()
        response.json.return_value = payload
        return response

    def test_wind_direction_compass_conversion(self):
        for deg, expected in [(0, "N"), (45, "NE"), (90, "E"), (180, "S"),
                              (270, "W"), (360, "N"), (11.25, "N")]:
            with self.subTest(deg=deg):
                main._cache.clear()
                main._cache_ttl.clear()
                payload = {"current": {"temperature_2m": 31.0, "wind_direction_10m": deg}}
                with mock.patch.object(main.requests, "get", return_value=self._fake_response(payload)):
                    result = main.get_weather()
                self.assertEqual(result["wind_direction"], expected)

    def test_upstream_error_becomes_error_envelope(self):
        with mock.patch.object(main.requests, "get", side_effect=Exception("boom")):
            result = main.get_weather()
        self.assertIn("error", result)

    def test_second_call_hits_cache(self):
        payload = {"current": {"temperature_2m": 31.0, "wind_direction_10m": 0}}
        with mock.patch.object(main.requests, "get", return_value=self._fake_response(payload)) as mocked:
            main.get_weather()
            main.get_weather()
        self.assertEqual(mocked.call_count, 1)


class ForecastEndpointTests(unittest.TestCase):
    def setUp(self):
        main._cache.clear()
        main._cache_ttl.clear()

    def test_ragged_arrays_degrade_gracefully(self):
        payload = {
            "daily": {"time": ["2026-09-03", "2026-09-04"], "temperature_2m_max": [33.0]},
            "hourly": {"time": ["2026-09-03T00:00"], "temperature_2m": [28.0]},
        }
        response = mock.Mock()
        response.json.return_value = payload
        with mock.patch.object(main.requests, "get", return_value=response):
            result = main.get_forecast()

        self.assertEqual(result["daily"][0]["temp_max"], 33.0)
        self.assertIsNone(result["daily"][1]["temp_max"])
        self.assertEqual(result["daily"][1]["precipitation"], 0)
        self.assertEqual(len(result["hourly"]), 1)
        self.assertIsNone(result["hourly"][0]["wind_speed"])

    def test_forecast_error_envelope(self):
        with mock.patch.object(main.requests, "get", side_effect=Exception("boom")):
            result = main.get_forecast()
        self.assertIn("error", result)


class HistoricalEndpointTests(unittest.TestCase):
    def test_archive_lag_guard_returns_error_without_network(self):
        from datetime import datetime
        result = main.fetch_historical_weather(datetime.now())
        self.assertIn("error", result)
        self.assertIn("Archive", result["error"])


if __name__ == "__main__":
    unittest.main()
