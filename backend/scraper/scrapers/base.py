from abc import ABC, abstractmethod

from scraper.models import TenderRecord


class BaseScraper(ABC):
    source_name: str

    @abstractmethod
    def fetch(self) -> list[TenderRecord]:
        ...
