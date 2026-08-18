"""Parses schema.org Restaurant/Menu JSON-LD (https://schema.org/Menu) — many
restaurant websites embed this for Google's rich-snippet requirements, which
makes it by far the most reliable extraction path when it's present. Always
try this before falling back to heuristic DOM scraping."""

from __future__ import annotations

import json
from typing import Any, Iterable

from .normalize import build_category, build_menu_item, price_to_cents


def _iter_jsonld_blocks(html_script_texts: Iterable[str]) -> Iterable[dict[str, Any]]:
    for raw in html_script_texts:
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, list):
            yield from (d for d in data if isinstance(d, dict))
        elif isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                yield from (d for d in data["@graph"] if isinstance(d, dict))
            else:
                yield data


def _find_menu_node(node: Any) -> dict[str, Any] | None:
    if not isinstance(node, dict):
        return None
    node_type = node.get("@type")
    types = node_type if isinstance(node_type, list) else [node_type]
    if "Menu" in types:
        return node
    if "Restaurant" in types or "FoodEstablishment" in types:
        has_menu = node.get("hasMenu")
        if isinstance(has_menu, dict):
            return has_menu
        if isinstance(has_menu, list) and has_menu:
            return has_menu[0]
    return None


def _menu_item_to_dict(item: dict[str, Any]) -> dict[str, Any] | None:
    name = item.get("name")
    if not name:
        return None
    offers = item.get("offers")
    price = None
    if isinstance(offers, dict):
        price = offers.get("price")
    elif isinstance(offers, list) and offers:
        price = offers[0].get("price")
    return build_menu_item(str(name), price_to_cents(price), item.get("description"))


def extract_menu_from_jsonld(html_script_texts: list[str]) -> dict[str, Any] | None:
    """Returns a ProspectMenu-shaped dict, or None if no schema.org menu was found."""
    for block in _iter_jsonld_blocks(html_script_texts):
        menu_node = _find_menu_node(block)
        if not menu_node:
            continue

        categories: list[dict[str, Any]] = []
        sections = menu_node.get("hasMenuSection")
        sections = sections if isinstance(sections, list) else ([sections] if sections else [])

        for section in sections:
            if not isinstance(section, dict):
                continue
            section_items = section.get("hasMenuItem")
            section_items = section_items if isinstance(section_items, list) else ([section_items] if section_items else [])
            items = [d for d in (_menu_item_to_dict(i) for i in section_items if isinstance(i, dict)) if d]
            if items:
                categories.append(build_category(str(section.get("name") or "Menu"), items))

        # Some sites list menu items directly on the Menu node with no sections.
        if not categories:
            direct_items = menu_node.get("hasMenuItem")
            direct_items = direct_items if isinstance(direct_items, list) else ([direct_items] if direct_items else [])
            items = [d for d in (_menu_item_to_dict(i) for i in direct_items if isinstance(i, dict)) if d]
            if items:
                categories.append(build_category("Menu", items))

        if categories:
            return {"categories": categories}

    return None
