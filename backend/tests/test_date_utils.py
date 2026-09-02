"""Tests for backend/date_utils.py — natural-language date parsing.

This module decides whether a query is routed to historical, current, or
forecast data, so its edge cases are the highest-risk parsing surface.
"""

import os
import sys
import unittest
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from date_utils import parse_date


def _minus_one_year(d):
    try:
        return d.replace(year=d.year - 1)
    except ValueError:  # Feb 29 in a non-leap year
        return d.replace(year=d.year - 1, day=28)


class SameDateLastYearTests(unittest.TestCase):
    def test_same_day_last_year(self):
        expected = _minus_one_year(date.today())
        self.assertEqual(parse_date("same day last year"), expected)

    def test_same_date_previous_year(self):
        expected = _minus_one_year(date.today())
        self.assertEqual(parse_date("weather same date previous year"), expected)

    def test_last_year_same_day_ordering(self):
        expected = _minus_one_year(date.today())
        self.assertEqual(parse_date("last year weather same day"), expected)

    def test_one_year_ago(self):
        expected = _minus_one_year(date.today())
        self.assertEqual(parse_date("1 year ago"), expected)


class RelativePhraseTests(unittest.TestCase):
    def test_yesterday(self):
        self.assertEqual(parse_date("was it rainy yesterday"), date.today() - timedelta(days=1))

    def test_today(self):
        self.assertEqual(parse_date("weather today"), date.today())

    def test_tomorrow(self):
        self.assertEqual(parse_date("weather tomorrow"), date.today() + timedelta(days=1))

    def test_n_days_ago(self):
        self.assertEqual(parse_date("3 days ago"), date.today() - timedelta(days=3))

    def test_n_weeks_ago(self):
        self.assertEqual(parse_date("2 weeks ago"), date.today() - timedelta(weeks=2))

    def test_n_months_ago_approximates_30_days(self):
        self.assertEqual(parse_date("5 months ago"), date.today() - timedelta(days=150))

    def test_n_years_ago(self):
        self.assertEqual(parse_date("weather 2 years ago"), _minus_one_year(_minus_one_year(date.today())))


class ExplicitDateTests(unittest.TestCase):
    def test_iso_date(self):
        self.assertEqual(parse_date("temperature on 2025-03-09"), date(2025, 3, 9))

    def test_dd_mm_yyyy(self):
        self.assertEqual(parse_date("rain on 09/03/2025"), date(2025, 3, 9))

    def test_day_month_name_year(self):
        self.assertEqual(parse_date("was it rainy on 9 March 2025"), date(2025, 3, 9))

    def test_month_name_day_year(self):
        self.assertEqual(parse_date("weather march 9, 2025"), date(2025, 3, 9))

    def test_in_year_defaults_jan_first(self):
        self.assertEqual(parse_date("weather in 2024"), date(2024, 1, 1))

    def test_of_year_defaults_jan_first(self):
        self.assertEqual(parse_date("rainfall of 2023"), date(2023, 1, 1))


class NoDateTests(unittest.TestCase):
    def test_query_without_date_returns_none(self):
        self.assertIsNone(parse_date("cyclone michaung"))

    def test_weather_only_does_not_fabricate_jan_first(self):
        # Guards against dateparser's Jan-1 default being treated as intent.
        self.assertIsNone(parse_date("how is the weather in chennai"))


if __name__ == "__main__":
    unittest.main()
