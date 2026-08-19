"""Scrapes an independent restaurant's own website. Plain HTTP (no Playwright) —
JSON-LD/schema.org markup, when present, is almost always server-rendered even
on otherwise JS-heavy sites since it exists for search-engine crawlers. Falls
back to a heuristic price-line scan of the rendered text when there's no
structured data to read.

Respects robots.txt (see scraper/settings.py) — this targets small independent
business sites, not a platform built to withstand scraping traffic.
"""

from __future__ import annotations

import json
import re

import scrapy

from ..jsonld import extract_menu_from_jsonld
from ..normalize import build_category, build_menu_item, empty_menu, price_to_cents

PRICE_LINE_RE = re.compile(r"^(.{2,80}?)[\s.\-–]{1,4}\$?\s*(\d+(?:[.,]\d{2}))\s*\$?$")


class GenericSiteSpider(scrapy.Spider):
    name = "generic_site"
    custom_settings = {"ROBOTSTXT_OBEY": True}

    def __init__(self, url: str, output_path: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [url]
        self.output_path = output_path
        self.result = empty_menu()

    def parse(self, response: scrapy.http.Response):
        jsonld_scripts = response.css('script[type="application/ld+json"]::text').getall()
        menu = extract_menu_from_jsonld(jsonld_scripts)
        if menu:
            self.result = menu
            return

        # Fallback: scan visible text nodes for "Name .... 12.50$" style lines —
        # the same shape as what an admin would manually paste, applied to
        # whatever text the page actually renders server-side.
        text_nodes = response.css("body ::text").getall()
        lines = [t.strip() for t in text_nodes if t.strip()]

        items = []
        for line in lines:
            match = PRICE_LINE_RE.match(line)
            if not match:
                continue
            name, raw_price = match.group(1).strip(" .-–"), match.group(2)
            price_cents = price_to_cents(raw_price)
            if name and price_cents:
                items.append(build_menu_item(name, price_cents))

        if items:
            self.result = {"categories": [build_category("Menu", items)]}

    def closed(self, reason: str):
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(self.result, f, ensure_ascii=False)
