"""Tests for backend/groq_llm.py — context loading and prompt building.

The LLM answer is grounded in data/llm_context.json; this suite verifies the
disk loading, TTL caching, corruption fallback, and hardcoded fallback that
keep the system prompt populated even before build_dataset.py has run.
"""

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import groq_llm


class LoadLlmContextTests(unittest.TestCase):
    def setUp(self):
        self._old_cwd = os.getcwd()
        self._tmpdir = tempfile.mkdtemp()
        os.chdir(self._tmpdir)
        # Reset module-level cache between tests.
        groq_llm._context_cache = {}
        groq_llm._context_loaded_at = None

    def tearDown(self):
        os.chdir(self._old_cwd)

    def _write_context(self, payload):
        with open("llm_context.json", "w") as f:
            json.dump(payload, f)

    def test_hardcoded_fallback_when_file_missing(self):
        ctx = groq_llm._load_llm_context()
        self.assertEqual(ctx["data_coverage"], "hardcoded fallback")
        self.assertIn("weather_climate", ctx)

    def test_disk_file_wins(self):
        self._write_context({"data_coverage": "saved", "weather_climate": {"avg_max_temp_c": 31.0}})
        self.assertEqual(groq_llm._load_llm_context()["data_coverage"], "saved")

    def test_corrupt_file_falls_back_to_hardcoded(self):
        with open("llm_context.json", "w") as f:
            f.write("{not valid json")
        ctx = groq_llm._load_llm_context()
        self.assertEqual(ctx["data_coverage"], "hardcoded fallback")

    def test_cache_serves_within_ttl(self):
        self._write_context({"data_coverage": "v1"})
        first = groq_llm._load_llm_context()
        self._write_context({"data_coverage": "v2"})
        second = groq_llm._load_llm_context()
        self.assertIs(first, second)
        self.assertEqual(second["data_coverage"], "v1")

    def test_ttl_expiry_reloads(self):
        self._write_context({"data_coverage": "v1"})
        groq_llm._load_llm_context()
        groq_llm._context_loaded_at = datetime.now() - timedelta(hours=7)
        self._write_context({"data_coverage": "v2"})
        self.assertEqual(groq_llm._load_llm_context()["data_coverage"], "v2")


class BuildContextBlockTests(unittest.TestCase):
    def setUp(self):
        self._old_cwd = os.getcwd()
        self._tmpdir = tempfile.mkdtemp()
        os.chdir(self._tmpdir)
        groq_llm._context_cache = {}
        groq_llm._context_loaded_at = None

    def tearDown(self):
        os.chdir(self._old_cwd)

    def test_fallback_block_is_complete_and_has_no_none_values(self):
        block = groq_llm._build_context_block()
        self.assertIn("CHENNAI HISTORICAL DATA CONTEXT (hardcoded fallback)", block)
        for section in ["CLIMATE:", "SEASONS:", "NOTABLE HISTORICAL EVENTS:", "SEISMIC:", "FLOOD RISK:"]:
            self.assertIn(section, block)
        self.assertNotIn("None", block)

    def test_loaded_values_appear_in_block(self):
        with open("llm_context.json", "w") as f:
            json.dump({
                "data_coverage": "saved",
                "weather_climate": {
                    "avg_max_temp_c": 31.0, "avg_min_temp_c": 23.5,
                    "hottest_recorded_c": 44.2, "coolest_recorded_c": 17.8,
                    "avg_annual_rainfall_mm": 1400, "max_daily_rainfall_mm": 490,
                    "avg_wind_kmh": 18, "max_wind_kmh": 140,
                    "seasonal_patterns": {"monsoon": "June-November", "cyclone": "Oct-Dec",
                                          "heatwave": "Mar-Jun", "dry_season": "Jan-Feb"},
                    "notable_events": ["2015 Chennai floods", "Cyclone Vardah"],
                },
            }, f)
        block = groq_llm._build_context_block()
        self.assertIn("CHENNAI HISTORICAL DATA CONTEXT (saved)", block)
        self.assertIn("31.0C", block)
        self.assertIn("2015 Chennai floods", block)


if __name__ == "__main__":
    unittest.main()
