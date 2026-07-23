import argparse
import logging

from scraper.config import MIN_TENDER_DATE
from scraper.db.base import SessionLocal, create_tables
from scraper.db.upsert import upsert_tender
from scraper.scrapers.base import BaseScraper
from scraper.scrapers.registry import SCRAPERS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run_one(scraper: BaseScraper) -> dict:
    """Tek bir scraper'ı çalıştırıp DB'ye yazar, sonuç özetini döner.

    Hem `run()` (CLI) hem de admin panelinin arka planda tetiklediği
    scraper istekleri bunu kullanıyor - mantık tek bir yerde."""
    session = SessionLocal()
    try:
        fetched = scraper.fetch()
        records = [
            r for r in fetched if r.tender_datetime and r.tender_datetime.date() >= MIN_TENDER_DATE
        ]
        skipped = len(fetched) - len(records)

        new_count = 0
        updated_count = 0
        for record in records:
            if upsert_tender(session, record):
                new_count += 1
            else:
                updated_count += 1
        session.commit()
    finally:
        session.close()

    result = {
        "source": scraper.source_name,
        "new_count": new_count,
        "updated_count": updated_count,
        "skipped": skipped,
        "total_fetched": len(fetched),
    }
    logger.info(
        "%s: %d yeni, %d güncellenen, %d elendi (%s öncesi/tarihsiz) - toplam %d çekildi",
        scraper.source_name,
        new_count,
        updated_count,
        skipped,
        MIN_TENDER_DATE.isoformat(),
        len(fetched),
    )
    return result


def run(scrapers: list[BaseScraper] | None = None) -> None:
    scrapers = scrapers if scrapers is not None else SCRAPERS
    create_tables()
    for scraper in scrapers:
        run_one(scraper)


def main() -> None:
    parser = argparse.ArgumentParser(prog="scraper")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("run", help="Kayıtlı tüm scraper'ları çalıştırır")

    args = parser.parse_args()
    if args.command == "run":
        run()


if __name__ == "__main__":
    main()
