"""Generic extractor for menu items embedded in a JS SPA's client-side state
(Next.js `__NEXT_DATA__`, Redux/Apollo state dumps, etc.) — used by the
delivery-platform spiders, which can't rely on schema.org markup the way
independent restaurant sites often do.

This intentionally does NOT hardcode a specific platform's JSON schema: exact
key names on Uber Eats / DoorDash change without notice and can't be verified
from this codebase's build environment (no live network access to those
sites). Instead it walks the whole state tree looking for dict shapes that
duck-type as a menu item (a name-like string field + a price-like field) and
groups them by whatever list they were found in. It is a best-effort net, not
a guarantee — expect to tighten NAME_KEYS/PRICE_KEYS/CATEGORY_KEYS below once
someone can compare against a real captured payload from the target site.
"""

from __future__ import annotations

import re
from typing import Any, Iterable

from .normalize import build_category, build_menu_item, price_to_cents

NAME_KEYS = ("name", "title", "itemName", "displayName")
PRICE_KEYS = ("price", "priceCents", "displayPrice", "formattedPrice", "priceValue")
DESCRIPTION_KEYS = ("description", "itemDescription", "subtitle")
CATEGORY_NAME_KEYS = ("title", "name", "sectionName", "categoryName")
CATEGORY_ITEMS_KEYS = ("items", "menuItems", "products", "dishes")

# Prices embedded in delivery-platform state are very often integer cents
# already (e.g. 1250 for $12.50), unlike a human-typed "12.50$". Treat a bare
# integer/float >= 100 as already-cents; anything smaller or string-shaped is
# run through the normal dollars parser.
def _price_value_to_cents(value: Any) -> int | None:
    if isinstance(value, (int, float)) and value >= 100:
        return int(round(value))
    return price_to_cents(value)


def _first_present(d: dict, keys: tuple[str, ...]) -> Any:
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return None


def _looks_like_menu_item(node: dict) -> bool:
    name = _first_present(node, NAME_KEYS)
    price = _first_present(node, PRICE_KEYS)
    return isinstance(name, str) and len(name) > 1 and price is not None


def _walk(node: Any) -> Iterable[Any]:
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def extract_menu_from_state(state: Any) -> dict[str, Any]:
    """Best-effort: finds lists of item-shaped dicts anywhere in the tree and
    groups them under whichever enclosing dict looks like a category, falling
    back to a single "Menu" category when no grouping is evident."""
    seen_item_ids: set[int] = set()
    categories: list[dict[str, Any]] = []
    uncategorized: list[dict[str, Any]] = []

    for node in _walk(state):
        if not isinstance(node, dict):
            continue

        items_field = _first_present(node, CATEGORY_ITEMS_KEYS)
        if isinstance(items_field, list) and items_field:
            candidate_items = [i for i in items_field if isinstance(i, dict) and _looks_like_menu_item(i)]
            if candidate_items:
                built = []
                for raw in candidate_items:
                    if id(raw) in seen_item_ids:
                        continue
                    seen_item_ids.add(id(raw))
                    built.append(
                        build_menu_item(
                            str(_first_present(raw, NAME_KEYS)),
                            _price_value_to_cents(_first_present(raw, PRICE_KEYS)),
                            _first_present(raw, DESCRIPTION_KEYS),
                        )
                    )
                if built:
                    category_name = _first_present(node, CATEGORY_NAME_KEYS) or "Menu"
                    categories.append(build_category(str(category_name), built))

    if not categories:
        # No clear category grouping found — sweep for any bare item-shaped
        # dicts and dump them into a single category rather than nothing.
        for node in _walk(state):
            if isinstance(node, dict) and _looks_like_menu_item(node) and id(node) not in seen_item_ids:
                seen_item_ids.add(id(node))
                uncategorized.append(
                    build_menu_item(
                        str(_first_present(node, NAME_KEYS)),
                        _price_value_to_cents(_first_present(node, PRICE_KEYS)),
                        _first_present(node, DESCRIPTION_KEYS),
                    )
                )
        if uncategorized:
            categories.append(build_category("Menu", uncategorized))

    return {"categories": categories}
