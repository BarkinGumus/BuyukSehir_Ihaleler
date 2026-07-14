from scraper.scrapers.base import BaseScraper
from scraper.scrapers.istanbul import IstanbulScraper

SCRAPERS: list[BaseScraper] = [
    IstanbulScraper(),
]
