"""Tests for backend/executor.py — plan-to-data routing.

execute_plan decides which external APIs get called for each intent. These
tests mock weather_service to verify routing without network access.
"""

import os
import sys
import unittest
from unittest import mock
from datetime import datetime, date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import weather_service
from executor import (_ensure_datetime, _infer_past_date_from_query,
                      _extract_all_past_years, execute_plan)


def _patch_service(**replacements):
    return mock.patch.multiple(weather_service, **{k: mock.Mock(return_value=v) for k, v in replacements.items()})


class EnsureDatetimeTests(unittest.TestCase):
    def test_none_passthrough(self):
        self.assertIsNone(_ensure_datetime(None))

    def test_datetime_passthrough(self):
        d = datetime(2024, 3, 5, 12, 30)
        self.assertIs(_ensure_datetime(d), d)

    def test_date_upgraded_to_midnight(self):
        d = _ensure_datetime(date(2024, 3, 5))
        self.assertEqual(d, datetime(2024, 3, 5, 0, 0))
        self.assertIsInstance(d, datetime)


class InferPastDateTests(unittest.TestCase):
    def test_past_year_infer(self):
        year = datetime.now().year - 2
        d = _infer_past_date_from_query(f"weather in {year}")
        self.assertIsNotNone(d)
        self.assertEqual(d.year, year)

    def test_future_year_returns_none(self):
        year = datetime.now().year + 2
        self.assertIsNone(_infer_past_date_from_query(f"weather in {year}"))

    def test_no_year_returns_none(self):
        self.assertIsNone(_infer_past_date_from_query("weather tomorrow"))


class ExtractPastYearsTests(unittest.TestCase):
    def test_range_inclusive(self):
        now = datetime.now()
        years = [d.year for d in _extract_all_past_years(f"compare {now.year - 4} to {now.year - 3}")]
        self.assertEqual(years, [now.year - 4, now.year - 3])

    def test_single_year(self):
        year = datetime.now().year - 3
        years = [d.year for d in _extract_all_past_years(f"in {year}")]
        self.assertEqual(years, [year])

    def test_two_digit_year_expands_2000s(self):
        year = datetime.now().year - 5
        two_digit = str(year)[-2:]
        years = [d.year for d in _extract_all_past_years(f"in {two_digit}")]
        self.assertEqual(years, [year])

    def test_capped_at_six_years(self):
        now = datetime.now()
        dates = _extract_all_past_years(f"compare {now.year - 12} to {now.year - 2}")
        self.assertLessEqual(len(dates), 6)
        self.assertEqual(sorted(d.year for d in dates), [d.year for d in dates])

    def test_reversed_range_swaps(self):
        now = datetime.now()
        years = [d.year for d in _extract_all_past_years(f"compare {now.year - 3} to {now.year - 4}")]
        self.assertEqual(years, [now.year - 4, now.year - 3])


class ExecutePlanRoutingTests(unittest.TestCase):
    def test_disaster_route_fetches_everything(self):
        with _patch_service(
            get_weather={"temp": 30}, get_forecast={"daily": []},
            get_cyclones={"cyclones": []}, get_earthquakes={"events": []},
            get_tsunamis={"events": []},
        ):
            result = execute_plan({
                "intent": "disaster", "all_intents": ["disaster", "weather", "cyclone", "earthquake", "tsunami"],
                "date": None, "query": "disaster overview", "context": {},
            })
        self.assertIsNotNone(result["weather"])
        self.assertIsNotNone(result["forecast"])
        self.assertIsNotNone(result["cyclone"])
        self.assertIsNotNone(result["earthquake"])
        self.assertIsNotNone(result["tsunami"])

    def test_current_weather_route(self):
        with _patch_service(get_weather={"temp": 30}, get_forecast={"daily": []}):
            result = execute_plan({
                "intent": "weather", "all_intents": ["weather"],
                "date": None, "query": "weather today", "context": {},
            })
        self.assertEqual(result["weather"], {"temp": 30})
        self.assertEqual(result["forecast"], {"daily": []})
        self.assertIsNone(result["historical_weather"])

    def test_past_year_in_query_upgrades_to_history(self):
        year = datetime.now().year - 2
        plan = {"intent": "weather", "all_intents": ["weather"],
                "date": None, "query": f"weather in {year}", "context": {}}
        with _patch_service(fetch_historical_weather={"daily": [{"date": f"{year}-01-01"}]}):
            result = execute_plan(plan)
        self.assertEqual(plan["intent"], "weather_history")
        self.assertEqual(result["historical_weather"], {"daily": [{"date": f"{year}-01-01"}]})

    def test_historical_date_route(self):
        past = datetime(datetime.now().year - 1, 6, 15)
        with mock.patch.object(weather_service, "fetch_historical_weather",
                               return_value={"daily": []}) as mocked:
            result = execute_plan({
                "intent": "weather_history", "all_intents": ["weather_history"],
                "date": past, "query": "weather last year", "context": {},
            })
            self.assertEqual(result["historical_weather"], {"daily": []})
            mocked.assert_called_once_with(past, days_range=1)

    def test_comparison_fetches_year_range(self):
        now = datetime.now()
        y1, y2 = now.year - 4, now.year - 3

        def fake_hist(d, days_range=1):
            return {"daily": [{"date": f"{d.year}-01-01"}], "ok": True}
        with mock.patch.object(weather_service, "get_weather", return_value={"temp": 30}), \
             mock.patch.object(weather_service, "get_forecast", return_value={"daily": []}), \
             mock.patch.object(weather_service, "fetch_historical_weather", side_effect=fake_hist):
            result = execute_plan({
                "intent": "weather_comparison", "all_intents": ["weather_comparison"],
                "date": None, "query": f"compare {y1} to {y2}",
                "context": {"wants_comparison": True},
            })
        comparison = result["historical_comparison"]
        self.assertEqual(sorted(h["queried_year"] for h in comparison), [y1, y2])
        self.assertEqual(result["historical_weather"], comparison[0])
        self.assertIsNotNone(result["forecast"])

    def test_comparison_rejects_errors_and_recent_dates(self):
        now = datetime.now()
        with mock.patch.object(weather_service, "get_weather", return_value={"temp": 30}), \
             mock.patch.object(weather_service, "get_forecast", return_value={"daily": []}), \
             mock.patch.object(weather_service, "fetch_historical_weather",
                               return_value={"error": "Archive data not yet available"}):
            result = execute_plan({
                "intent": "weather_comparison", "all_intents": ["weather_comparison"],
                "date": None, "query": f"compare {now.year - 1} to {now.year - 2}",
                "context": {"wants_comparison": True},
            })
        self.assertIsNone(result["historical_comparison"])
        self.assertIsNone(result["historical_weather"])

    def test_cyclone_recent_sorts_top_three(self):
        cyclones = [{"name": n, "year": y} for n, y in
                    [("a", 2010), ("b", 2020), ("c", 2015), ("d", 2023), ("e", 2018)]]
        with mock.patch.object(weather_service, "get_cyclones", return_value={"cyclones": cyclones}):
            result = execute_plan({
                "intent": "cyclone_history", "all_intents": ["cyclone"],
                "date": None, "query": "latest cyclones",
                "context": {"wants_recent": True, "cyclone_name": None, "year": None},
            })
        self.assertEqual([c["year"] for c in result["cyclone"]["cyclones"]], [2023, 2020, 2018])

    def test_cyclone_named_passes_name_and_year(self):
        with mock.patch.object(weather_service, "get_cyclones",
                               return_value={"cyclones": []}) as mocked:
            execute_plan({
                "intent": "cyclone_history", "all_intents": ["cyclone"],
                "date": None, "query": "cyclone michaung",
                "context": {"wants_recent": False, "cyclone_name": "michaung", "year": 2023},
            })
            mocked.assert_called_once_with(name="michaung", year=2023)

    def test_future_date_returns_forecast_not_current(self):
        future = date.today() + timedelta(days=3)
        with _patch_service(get_forecast={"daily": []}):
            result = execute_plan({
                "intent": "weather", "all_intents": ["weather"],
                "date": future, "query": "weather", "context": {},
            })
        self.assertEqual(result["forecast"], {"daily": []})
        self.assertIsNone(result["weather"])

    def test_error_responses_do_not_raise(self):
        with mock.patch.object(weather_service, "get_weather", return_value={"error": "boom"}):
            result = execute_plan({
                "intent": "weather", "all_intents": ["weather"],
                "date": None, "query": "weather", "context": {},
            })
        self.assertEqual(result["weather"], {"error": "boom"})


if __name__ == "__main__":
    unittest.main()
