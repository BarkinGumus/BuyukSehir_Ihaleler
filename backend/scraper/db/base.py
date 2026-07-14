from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from scraper.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)


def create_tables() -> None:
    from scraper.db import models  # noqa: F401 - Tender sınıfını Base.metadata'ya kaydeder

    Base.metadata.create_all(engine)
