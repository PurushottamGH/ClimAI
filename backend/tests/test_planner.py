"""Tests for backend/planner.py — intent classification and plan building.

plan_query is the first stage of the /ask pipeline: a misclassification here
sends the executor and LLM down the wrong data path.
"""

import os
import sys
import unittest
from unittest import mock
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import planner
from planner import _normalize_query, _expand_disaster_intents, classify_query


class NormalizeQueryTests(unittest.TestCase):
    def test_typos_corrected(self):
        self.assertEqual(_normalize_query("previuos year weather historcal"),
                         "previous year weather historical")

    def test_unknown_text_untouched(self):
        self.assertEqual(_normalize_query("cyclone michaung"), "cyclone michaung")


class ExpandDisasterIntentTests(unittest.TestCase):
    def test_disaster_expands_to_all_domains(self):
        self.assertCountEqual(
            _expand_disaster_intents(["disaster"]),
            ["disaster", "weather", "cyclone", "earthquake", "tsunami"],
        )

    def test_existing_intents_preserved(self):
        self.assertCountEqual(
            _expand_disaster_intents(["disaster", "earthquake"]),
            ["disaster", "weather", "cyclone", "earthquake", "tsunami"],
        )


class ClassifyQueryTests(unittest.TestCase):
    def test_current_weather_default(self):
        self.assertIn("weather", classify_query("weather"))

    def test_past_history_intent(self):
        self.assertIn("weather_history", classify_query("was the weather good yesterday"))

    def test_future_prediction_intent(self):
        self.assertIn("prediction", classify_query("will it rain tomorrow in chennai"))

    def test_cyclone_history(self):
        intents = classify_query("when did cyclone michaung hit chennai")
        self.assertIn("cyclone", intents)
        self.assertNotIn("cyclone_prediction", intents)

    def test_cyclone_future_prediction(self):
        self.assertIn("cyclone_prediction", classify_query("will cyclone vardah come again"))

    def test_earthquake_and_tsunami(self):
        self.assertIn("earthquake", classify_query("earthquake in japan"))
        self.assertIn("tsunami", classify_query("tsunami warning"))

    def test_year_range_adds_comparison(self):
        intents = classify_query("2020 to 2024 temperature")
        self.assertIn("weather_comparison", intents)

    def test_disaster_keyword_expands(self):
        intents = classify_query("give me a disaster overview")
        self.assertIn("disaster", intents)
        self.assertIn("weather", intents)
        self.assertIn("cyclone", intents)


class ExtractQueryContextTests(unittest.TestCase):
    def test_cyclone_year_location(self):
        ctx = planner.extract_query_context("cyclone michaung 2023 chennai")
        self.assertEqual(ctx["cyclone_name"], "michaung")
        self.assertEqual(ctx["year"], 2023)
        self.assertEqual(ctx["location"], "chennai")

    def test_wants_recent(self):
        self.assertTrue(planner.extract_query_context("latest earthquake tremors")["wants_recent"])

    def test_comparison_detected(self):
        self.assertTrue(planner.extract_query_context("today vs last year weather")["wants_comparison"])

    def test_iso_date_does_not_leak_into_year(self):
        ctx = planner.extract_query_context("temperature 2025-03-09")
        self.assertIsNone(ctx["year"])


class PlanQueryTests(unittest.TestCase):
    def _patch_llm(self, side_effect):
        return mock.patch.object(planner, "extract_intent_with_llm", side_effect=side_effect)

    def test_regex_fallback_when_llm_fails(self):
        with self._patch_llm(lambda q: None):
            plan = planner.plan_query("cyclone michaung")
        self.assertEqual(plan["intent"], "cyclone_history")
        self.assertEqual(plan["context"]["cyclone_name"], "michaung")

    def test_regex_fallback_parses_date(self):
        with self._patch_llm(lambda q: None):
            plan = planner.plan_query("how was the weather yesterday")
        self.assertEqual(plan["intent"], "weather_history")
        self.assertEqual(plan["date"], date.today() - timedelta(days=1))

    def test_comparison_is_primary_intent(self):
        now = datetime.now()
        with self._patch_llm(lambda q: None):
            plan = planner.plan_query(f"{now.year - 2} vs {now.year - 1} temperature")
        self.assertEqual(plan["intent"], "weather_comparison")
        self.assertIn("weather_history", plan["all_intents"])

    def test_llm_result_used_directly(self):
        llm_result = {
            "intents": ["cyclone"],
            "context": {"cyclone_name": "michaung", "year": None, "location": None,
                        "wants_recent": False, "wants_comparison": False},
        }
        with self._patch_llm(lambda q: llm_result):
            plan = planner.plan_query("cyclone michaung latest")
        self.assertEqual(plan["intent"], "cyclone_history")
        self.assertEqual(plan["all_intents"], ["cyclone"])
        self.assertEqual(plan["context"]["cyclone_name"], "michaung")

    def test_disaster_expansion_applied_to_llm_results(self):
        with self._patch_llm(lambda q: {"intents": ["disaster"], "context": {}}):
            plan = planner.plan_query("disaster overview")
        self.assertEqual(plan["intent"], "disaster")
        self.assertIn("weather", plan["all_intents"])
        self.assertIn("cyclone", plan["all_intents"])

    def test_empty_llm_intents_fall_back_to_regex(self):
        with self._patch_llm(lambda q: {"intents": [], "context": {}}):
            plan = planner.plan_query("weather today")
        self.assertEqual(plan["intent"], "weather")


if __name__ == "__main__":
    unittest.main()
