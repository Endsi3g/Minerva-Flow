BOT_NAME = "minerva_menu_scraper"

SPIDER_MODULES = ["scraper.spiders"]
NEWSPIDER_MODULE = "scraper.spiders"

# Ethical default for the open web — the generic restaurant-website spider
# respects it. The delivery-platform spiders (Uber Eats/DoorDash) override
# this per-spider via custom_settings; that's a deliberate, informed choice
# made by the Minerva team, not an oversight — see their spider files and
# scraper-service/README.md for the reasoning.
ROBOTSTXT_OBEY = True

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MinervaMenuBot/1.0"
)

# Polite pacing for the generic spider — this hits real independent restaurant
# sites, not a platform built for scale. Individual spiders can tighten or
# loosen this via custom_settings.
DOWNLOAD_DELAY = 1.5
CONCURRENT_REQUESTS_PER_DOMAIN = 2
AUTOTHROTTLE_ENABLED = True

DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"

PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {"headless": True}
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 25_000

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
LOG_LEVEL = "INFO"
