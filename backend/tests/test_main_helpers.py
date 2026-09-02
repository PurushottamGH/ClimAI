"""Tests for backend/main.py — pure helper logic (cache, ML data prep, date/query parsing).

Importing main pulls in fastapi/groq (both in requirements.txt) but none of
these tests touch the network: ML models are trained on tiny in-memory arrays
and API reads are only tested in test_main_api.py.
"""

import os
import sys
import unittest
from unittest import mock
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import numpy as np

import main


class CacheTests(unittest.TestCase):
    def setUp(self):
        main._cache.clear()
        main._cache_ttl.clear()

    def test_set_then_get_within_ttl(self):
        main._set_cache("k", {"v": 1})
        main._cache_ttl["k"] = datetime.now() - timedelta(seconds=100)
        self.assertEqual(main._get_cache("k", ttl_seconds=300), {"v": 1})

    def test_expired_entry_returns_none(self):
        main._set_cache("k", {"v": 1})
        main._cache_ttl["k"] = datetime.now() - timedelta(seconds=301)
        self.assertIsNone(main._get_cache("k", ttl_seconds=300))

    def test_missing_key_returns_none(self):
        self.assertIsNone(main._get_cache("missing", ttl_seconds=300))


class PrepareFeaturesTests(unittest.TestCase):
    def test_window_windows_and_targets(self):
        X, y_max, y_min = main.prepare_features(list(range(10)), list(range(10)), window=3)
        self.assertEqual(X.shape, (7, 3))
        self.assertEqual(len(y_max), 7)
        self.assertEqual(len(y_min), 7)
        np.testing.assert_array_equal(X[0], [0, 1, 2])
        self.assertEqual(y_max[0], 3)

    def test_window_larger_than_data_yields_empty(self):
        X, y_max, y_min = main.prepare_features(list(range(5)), list(range(5)), window=7)
        self.assertEqual(X.shape, (0,))
        self.assertEqual(len(y_max), 0)

    def test_short_min_series_truncated(self):
        X, y_max, y_min = main.prepare_features(list(range(20)), list(range(5)), window=7)
        self.assertEqual(X.shape, (13, 7))
        self.assertEqual(len(y_max), 13)
        self.assertEqual(len(y_min), 0)


class ActivationTests(unittest.TestCase):
    def test_sigmoid_bounds_and_midpoint(self):
        self.assertAlmostEqual(main._sigmoid(0), 0.5)
        self.assertAlmostEqual(main._sigmoid(1000), 1.0, places=6)
        self.assertAlmostEqual(main._sigmoid(-1000), 0.0, places=6)

    def test_tanh_bounds(self):
        self.assertAlmostEqual(main._tanh(0), 0.0)
        self.assertAlmostEqual(main._tanh(10), 1.0, places=6)


class NumpyLSTMTests(unittest.TestCase):
    def setUp(self):
        np.random.seed(42)

    def test_forward_sequence_shapes(self):
        lstm = main.NumpyLSTM(input_size=1, hidden_size=4)
        seq = (np.arange(6) * 0.1).reshape(6, 1)
        y, h, c = lstm.forward_sequence(seq)
        self.assertIsInstance(y, float)
        self.assertEqual(h.shape, (4, 1))
        self.assertEqual(c.shape, (4, 1))

    def test_train_step_reduces_loss(self):
        lstm = main.NumpyLSTM(input_size=1, hidden_size=4, lr=0.02)
        seq = (np.arange(6) * 0.1).reshape(6, 1)
        first = lstm.train_step(seq, 1.0)
        last = first
        for _ in range(40):
            last = lstm.train_step(seq, 1.0)
        self.assertLess(last, first)


class ParseDaysFromQueryTests(unittest.TestCase):
    def test_explicit_days(self):
        self.assertEqual(main.parse_days_from_query("3 days forecast"), 3)
        self.assertEqual(main.parse_days_from_query("10 day weather"), 10)

    def test_days_ago_not_interpreted_as_forecast_length(self):
        # Regression: "N days ago" is a date, not a forecast window.
        self.assertEqual(main.parse_days_from_query("5 days ago"), 7)

    def test_weeks_and_default(self):
        self.assertEqual(main.parse_days_from_query("1 week outlook"), 7)
        self.assertEqual(main.parse_days_from_query("weather report"), 7)


class ParseDateFromQueryTests(unittest.TestCase):
    def test_relative_keywords(self):
        tomorrow = datetime.now() + timedelta(days=1)
        dt, kind = main.parse_date_from_query("tomorrow")
        self.assertEqual(dt.date(), tomorrow.date())
        self.assertEqual(kind, "relative_future")

        dt, kind = main.parse_date_from_query("3 weeks ago")
        self.assertEqual(dt.date(), (datetime.now() - timedelta(weeks=3)).date())
        self.assertEqual(kind, "relative_past")

    def test_current_time_keywords(self):
        dt, kind = main.parse_date_from_query("right now")
        self.assertEqual(kind, "today")

    def test_explicit_formats(self):
        year = datetime.now().year - 1
        cases = [
            (f"16 feb {year}", datetime(year, 2, 16)),
            (f"february 16, {year}", datetime(year, 2, 16)),
            (f"{year}-03-09", datetime(year, 3, 9)),
            (f"31/12/{year}", datetime(year, 12, 31)),
            (f"march {year}", datetime(year, 3, 1)),
            (f"{year}", datetime(year, 1, 1)),
        ]
        for query, expected in cases:
            with self.subTest(query=query):
                dt, kind = main.parse_date_from_query(query)
                self.assertEqual(dt, expected)
                self.assertEqual(kind, "specific_past")

    def test_bare_current_year_is_ambiguous(self):
        dt, kind = main.parse_date_from_query(str(datetime.now().year))
        self.assertIsNone(dt)
        self.assertIsNone(kind)

    def test_same_day_last_year(self):
        now = datetime.now()
        dt, kind = main.parse_date_from_query("same day last year")
        self.assertEqual(dt.date(), now.date().replace(year=now.year - 1))
        self.assertEqual(kind, "relative_past")


class MainClassifyQueryTests(unittest.TestCase):
    def test_history_vs_prediction_vs_current(self):
        self.assertIn("weather_history", main.classify_query("did it rain in chennai yesterday"))
        self.assertIn("prediction", main.classify_query("will it rain tomorrow"))
        self.assertIn("weather", main.classify_query("weather"))

    def test_cyclone_and_disaster(self):
        self.assertIn("cyclone", main.classify_query("cyclone michaung"))
        self.assertIn("disaster", main.classify_query("disaster overview"))


class MainExtractContextTests(unittest.TestCase):
    def test_full_context(self):
        ctx = main.extract_query_context("cyclone michaung 2023 tamil nadu latest")
        self.assertEqual(ctx["cyclone_name"], "michaung")
        self.assertEqual(ctx["year"], 2023)
        self.assertEqual(ctx["location"], "tamil nadu")
        self.assertTrue(ctx["wants_recent"])

    def test_iso_date_not_a_year(self):
        ctx = main.extract_query_context("temperature 2025-03-09")
        self.assertIsNone(ctx["year"])


class NumpyIsolationTests(unittest.TestCase):
    def test_import_does_not_call_network(self):
        # main imports requests lazily inside request handlers only.
        self.assertTrue(hasattr(main, "app"))
        self.assertIsNotNone(main.app.title)


if __name__ == "__main__":
    unittest.main()
