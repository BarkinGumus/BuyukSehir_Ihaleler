from scraper.scrapers.ankara import AnkaraScraper
from scraper.scrapers.base import BaseScraper
from scraper.scrapers.istanbul import IstanbulScraper
from scraper.scrapers.kocaeli import KocaeliScraper

SCRAPERS: list[BaseScraper] = [
    IstanbulScraper(),
    AnkaraScraper(),
    KocaeliScraper(),
]
