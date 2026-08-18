"""Shared helpers for turning raw scraped text/JSON into the ProspectMenu shape.
Mirrors the heuristics in lib/prospects/parse-menu.ts (dietary tags, price parsing)
so a scraped menu and a manually-pasted one produce comparably-shaped data."""

from __future__ import annotations

import itertools
import re
from typing import Any, Optional

_ID_COUNTER = itertools.count(1)

PRICE_RE = re.compile(r"\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?")

DIETARY_KEYWORDS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"v[ée]gan", re.I), "vegan"),
    (re.compile(r"v[ée]g[ée]tarien|vegetarian", re.I), "vegetarian"),
    (re.compile(r"sans gluten|gluten.?free", re.I), "gluten_free"),
    (re.compile(r"\bhalal\b", re.I), "halal"),
    (re.compile(r"\bkasher\b|\bkosher\b", re.I), "kosher"),
    (re.compile(r"\b[ée]pic[ée]|\bspicy\b", re.I), "spicy"),
    (re.compile(r"\bnoix\b|\bnuts?\b|arachides", re.I), "contains_nuts"),
]


def next_id(prefix: str) -> str:
    return f"{prefix}-{next(_ID_COUNTER)}"


def price_to_cents(raw: str | float | int | None) -> Optional[int]:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return round(float(raw) * 100)
    match = PRICE_RE.search(str(raw))
    if not match:
        return None
    try:
        return round(float(match.group(1).replace(",", ".")) * 100)
    except ValueError:
        return None


def detect_dietary_tags(text: str) -> list[str]:
    return [tag for pattern, tag in DIETARY_KEYWORDS if pattern.search(text)]


def build_menu_item(name: str, price_cents: Optional[int], description: str | None = None) -> dict[str, Any]:
    combined_text = f"{name} {description or ''}"
    return {
        "id": next_id("item"),
        "name": name.strip(),
        "description": description.strip() if description else None,
        "priceCents": price_cents or 0,
        "inStock": True,
        "dietaryTags": detect_dietary_tags(combined_text),
        "modifierGroups": [],
    }


def build_category(name: str, items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"id": next_id("cat"), "name": name.strip(), "items": items}


def empty_menu() -> dict[str, Any]:
    return {"categories": []}
