from ._base import PlaywrightMenuSpider


class UberEatsSpider(PlaywrightMenuSpider):
    name = "ubereats"
    # Deliberately does not respect robots.txt for this specific target — see
    # scraper/spiders/_base.py and scraper-service/README.md for why.
    custom_settings = {
        "ROBOTSTXT_OBEY": False,
        "DOWNLOAD_DELAY": 0,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }
