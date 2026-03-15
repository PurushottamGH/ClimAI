from datetime import datetime, timedelta
import re
import dateparser


def parse_date(query: str):
    """
    Advanced date intelligence module.
    Fixes:
      - "previous year same date" / "last year" / "same day last year" etc.
        now correctly returns today's date minus 1 year, NOT Jan 1st.
      - Explicit dates like "Mar 9 2025", "2025-03-09" parsed correctly.
      - Relative phrases like "3 days ago", "yesterday" work as before.
    """
    clean = query.lower().strip()
    now   = datetime.utcnow()
    today = now.date()

    # ── 1. "same date / same day / today's date — previous year / last year" ──
    # Catches all natural ways a user says "this day but last year"
    same_date_last_year_patterns = [
        r"same (date|day).{0,20}(last|previous|prior) year",
        r"(last|previous|prior) year.{0,20}same (date|day)",
        r"this (date|day).{0,20}(last|previous|prior) year",
        r"(last|previous|prior) year.{0,20}this (date|day)",
        r"(last|previous|prior) year.{0,20}today",
        r"today.{0,20}(last|previous|prior) year",
        r"same date last year",
        r"same day last year",
        r"year ago today",
        r"a year ago",
        r"1 year ago",
        # Handles: "tell me previous year 2025 weather" when today is Mar 9 2026
        # i.e. user wants Mar 9 2025
        r"(previous|last|prior) year \d{4}",
        r"\d{4}.{0,10}(previous|last|prior) year",
    ]
    for pattern in same_date_last_year_patterns:
        if re.search(pattern, clean):
            try:
                return today.replace(year=today.year - 1)
            except ValueError:
                # Handles Feb 29 edge case
                return today.replace(year=today.year - 1, day=28)

    # ── 2. Explicit relative phrases (fast path before dateparser) ──
    if "yesterday" in clean:
        return (today - timedelta(days=1))

    if "today" in clean:
        return today

    if "tomorrow" in clean:
        return (today + timedelta(days=1))

    # e.g. "3 days ago", "2 weeks ago"
    m = re.search(r'(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago', clean)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        if "day" in unit:   return (today - timedelta(days=n))
        if "week" in unit:  return (today - timedelta(weeks=n))
        if "month" in unit: return (today - timedelta(days=n * 30))
        if "year" in unit:
            try:    return today.replace(year=today.year - n)
            except: return today.replace(year=today.year - n, day=28)

    # ── 3. Explicit date formats (YYYY-MM-DD or DD/MM/YYYY) ──
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', clean)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3))).date()
        except ValueError:
            pass

    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', clean)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
        except ValueError:
            pass

    # ── 4. Explicit month name + day + year e.g. "Mar 9 2025", "9 March 2025" ──
    m = re.search(
        r'(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})|'
        r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})',
        clean
    )
    if m:
        parsed = dateparser.parse(m.group(0),
                                  settings={"PREFER_DATES_FROM": "past",
                                            "RETURN_AS_TIMEZONE_AWARE": False})
        if parsed:
            return parsed.date()

    # ── 5. Isolated "in YYYY" or "of YYYY" — return Jan 1 of that year only
    #       when the user clearly means a whole year, not a specific date
    m = re.search(r'\b(in|of|year)\s+(19\d{2}|20\d{2})\b', clean)
    if m:
        try:
            return datetime(int(m.group(2)), 1, 1).date()
        except ValueError:
            pass

    # ── 6. Last resort: strip noise words and try dateparser ──
    #    Only pass short date-like fragments, NOT the full sentence
    #    (full sentences confuse dateparser into picking Jan 1)
    noise = r'\b(tell|me|what|was|the|weather|like|previous|last|this|same|day|date|year|in|for|at|of|a|an|give|show|fetch|get|want|need|please|how|about|is|are|will|be)\b'
    stripped = re.sub(noise, '', clean).strip()
    stripped = re.sub(r'\s+', ' ', stripped)

    if stripped and len(stripped) > 2:
        parsed = dateparser.parse(
            stripped,
            settings={"PREFER_DATES_FROM": "past", "RETURN_AS_TIMEZONE_AWARE": False}
        )
        if parsed:
            # Safety check: reject if dateparser returned Jan 1 with no "jan" or "january"
            # or "1st" in the original query — that's a default, not user intent
            if parsed.month == 1 and parsed.day == 1:
                if not re.search(r'\b(jan|january|1st|jan\s*1|01[/-]01)\b', clean):
                    return None   # Refuse the bad default
            return parsed.date()

    return None

