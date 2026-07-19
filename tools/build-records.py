#!/usr/bin/env python3
"""
Generate the published assets/records.js from the private source of truth.

The source (private/records.source.json, gitignored) holds the complete transcription,
including living people's names and dates. This script emits the public file with
living-person PII removed.

Why generated rather than edited in place: these records must be restorable. When a
person flagged "living" dies, clear the flag, add their death date, re-run, and the
full record returns. Destructive editing would lose data that only exists on a stone
in a field.

What is removed for anyone flagged "living":
  - first_name          -> "[Living]"
  - birth_date          -> ""
  - death_date          -> ""   (the " " sentinel means "living"; see notes below)
  - inscription lines carrying their name, their date of birth, or a marriage
    date -> each replaced with "[Redacted]" (not dropped: see below)

What is deliberately kept:
  - last_name           -- already disclosed by the deceased spouse on the same stone,
                           and the directory sorts by it; redacting it would break
                           family grouping, which is the point of the site
  - coords, photos      -- plot location is not personal
  - generic lines       -- "BELOVED WIFE", "TOGETHER FOREVER" identify nobody

Both spouses on a marker share one identical inscription array (it is the full text of
the shared stone), so redaction is computed per marker and written to every record on
it. Redacting only the living person's own record would leave the data intact in the
deceased spouse's record.

Usage:  python3 tools/build-records.py [--check]
        --check  report what would change without writing
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "private" / "records.source.json"
OUTPUT = ROOT / "assets" / "records.js"

LIVING_NAME = "[Living]"
REDACTED_LINE = "[Redacted]"


def is_living(rec):
    return bool(rec.get("living"))


def name_tokens(rec):
    """Significant words of a given name, for matching against inscription lines."""
    return [w for w in re.split(r"[\s.]+", (rec.get("first_name") or "").upper()) if len(w) > 2]


def line_is_pii(line, living):
    """True if this inscription line carries a living person's identity or a marriage date."""
    U = line.upper()

    # Marriage dates are knowledge-based-authentication answers, same class as a DOB.
    if "MARRIED" in U:
        return "marriage date"

    for person in living:
        toks = name_tokens(person)
        # A name line: short, and contains the person's significant given-name words.
        if toks and len(U) < 40 and all(t in U for t in toks[:2]):
            return "name of living person"

        birth = str(person.get("birth_date") or "")
        year = re.search(r"(\d{4})", birth)
        month = re.search(r"([A-Za-z]{3})", birth)
        if year and month and year.group(1) in U and month.group(1).upper() in U:
            return "date of birth of living person"
        # Numeric-only form, e.g. "[Redacted]" for Jul 27 1939.
        if year and re.fullmatch(r"[\d\-\s]+", line) and year.group(1)[2:] in U:
            return "date of birth of living person"

    return None


def build(records, verbose=True):
    # Group by shared photo: that is what identifies a physical marker.
    by_marker = {}
    for rec in records:
        for photo in rec.get("photos") or []:
            by_marker.setdefault(photo, []).append(rec)

    redacted_inscriptions = {}
    removed_total = 0
    for photo, group in sorted(by_marker.items()):
        living = [r for r in group if is_living(r)]
        if not living:
            continue
        original = group[0].get("inscription") or []
        kept = []
        for line in original:
            reason = line_is_pii(line, living)
            if reason:
                removed_total += 1
                # Substitute a placeholder rather than dropping the line. Silently
                # removing it makes the remaining text look like the whole stone, so a
                # reader sees a "[Living]" record whose inscription names only the
                # deceased spouse -- which reads as a duplicate of the spouse's record.
                # The placeholder shows that text existed and was withheld.
                kept.append(REDACTED_LINE)
                if verbose:
                    print(f"  {photo}: redacted {line!r} ({reason})")
            else:
                kept.append(line)
        for rec in group:
            redacted_inscriptions[id(rec)] = kept

    # Sort on the TRUE names, before redaction, so display order stays correct and
    # families stay grouped.
    def sort_key(rec):
        return (
            (rec.get("last_name") or "").lower(),
            (rec.get("first_name") or "").lower(),
            str(rec.get("birth_date") or ""),
        )

    out = []
    for rec in sorted(records, key=sort_key):
        pub = {
            "last_name": rec.get("last_name"),
            "first_name": rec.get("first_name"),
            "birth_date": rec.get("birth_date"),
            "death_date": rec.get("death_date"),
            "photos": rec.get("photos") or [],
            "coords": rec.get("coords"),
            "inscription": redacted_inscriptions.get(id(rec), rec.get("inscription") or []),
        }
        if is_living(rec):
            pub["first_name"] = LIVING_NAME
            # Both must be falsy: app.js renders the dates element if either is truthy,
            # so blanking only one would display "? - ".
            pub["birth_date"] = ""
            pub["death_date"] = ""
        out.append(pub)

    return out, removed_total


def main():
    check_only = "--check" in sys.argv
    records = json.loads(SOURCE.read_text(encoding="utf-8"))
    living = [r for r in records if is_living(r)]
    print(f"source: {len(records)} records, {len(living)} flagged living")

    out, removed = build(records)
    print(f"redacted {removed} inscription lines")

    payload = "window.POLONIA_RECORDS = " + json.dumps(out, indent=2, ensure_ascii=False) + ";\n"

    if check_only:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        print("no change" if current == payload else "WOULD CHANGE " + str(OUTPUT))
        return

    OUTPUT.write_text(payload, encoding="utf-8")
    print(f"wrote {OUTPUT} ({len(payload)} bytes)")


if __name__ == "__main__":
    main()
