"""Shared base for the delivery-platform spiders. These deliberately do NOT
obey robots.txt (see custom_settings on the concrete spiders) and render with
a real headless browser — an informed choice the Minerva team made knowing
it's likely against Uber Eats' / DoorDash's terms of service (see
scraper-service/README.md). Expect this to need maintenance: these platforms
change their frontend and anti-bot posture without notice, and this scraper
was written without live access to either site to verify current markup.
"""

from __future__ import annotations

import json

import scrapy
from scrapy_playwright.page import PageMethod

from ..embedded_state import extract_menu_from_html
from ..normalize import empty_menu


class PlaywrightMenuSpider(scrapy.Spider):
    def __init__(self, url: str, output_path: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = [url]
        self.output_path = output_path
        self.result = empty_menu()

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                meta={
                    "playwright": True,
                    "playwright_include_page": False,
                    "playwright_page_methods": [
                        PageMethod("wait_for_load_state", "networkidle"),
                        # A modest settle delay for menu content that streams in
                        # after the initial network-idle event.
                        PageMethod("wait_for_timeout", 2000),
                    ],
                },
                callback=self.parse,
                errback=self.errback,
            )

    def parse(self, response: scrapy.http.Response):
        json_ld_scripts = response.css('script[type="application/ld+json"]::text').getall()
        self.result = extract_menu_from_html(response.text, json_ld_scripts)

    def errback(self, failure):
        self.logger.error("Playwright request failed: %s", failure)

    def closed(self, reason: str):
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(self.result, f, ensure_ascii=False)
