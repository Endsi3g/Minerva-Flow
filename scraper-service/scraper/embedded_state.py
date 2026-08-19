"""Finds and parses the JSON blob(s) a JS SPA embeds in its own HTML — the
standard approach for scraping React/Next.js apps without depending on
DOM structure that changes with every frontend redeploy."""

from __future__ import annotations

import json
import re
from typing import Any

from .deep_json_scan import extract_menu_from_state
from .jsonld import extract_menu_from_jsonld

# Matches `window.SOMETHING = {...};` / `window.SOMETHING = [...];` assignments,
# the common pattern for pre-React-hydration state dumps (Apollo, Redux, etc.)
# when a page isn't Next.js-flavored (no __NEXT_DATA__ script tag).
INLINE_STATE_ASSIGNMENT_RE = re.compile(
    r"window\.__[A-Za-z0-9_]*(?:STATE|DATA|PROPS)__\s*=\s*(\{.*?\}|\[.*?\])\s*;", re.DOTALL
)


def _try_parse(raw: str) -> Any | None:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None


def extract_menu_from_html(html: str, json_ld_script_texts: list[str]) -> dict[str, Any]:
    # 1. schema.org markup, if the platform happens to include it — cheapest, most reliable.
    menu = extract_menu_from_jsonld(json_ld_script_texts)
    if menu and menu["categories"]:
        return menu

    # 2. Next.js's __NEXT_DATA__ script tag — present on any Next.js-built site.
    next_data_match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL
    )
    if next_data_match:
        state = _try_parse(next_data_match.group(1))
        if state is not None:
            menu = extract_menu_from_state(state)
            if menu["categories"]:
                return menu

    # 3. Any other application/json script tag — catches generic embedded API responses.
    for match in re.finditer(r'<script[^>]+type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL):
        state = _try_parse(match.group(1))
        if state is None:
            continue
        menu = extract_menu_from_state(state)
        if menu["categories"]:
            return menu

    # 4. `window.__X_STATE__ = {...}` inline-script assignments (Redux/Apollo style).
    for match in INLINE_STATE_ASSIGNMENT_RE.finditer(html):
        state = _try_parse(match.group(1))
        if state is None:
            continue
        menu = extract_menu_from_state(state)
        if menu["categories"]:
            return menu

    return {"categories": []}
