from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from scraper.db.models import Tender


def get_known_tender_dates(session: Session, source: str) -> dict[str, datetime | None]:
    """Bu kaynağa ait DB'deki tüm (external_id -> tender_datetime) çiftlerini döner.

    Detay sayfasına/isteğine gitmeden önce "bu kayıt zaten var mı, tarihi
    değişti mi" kontrolü için kullanılıyor - kayıt başına ayrı sorgu atmak
    yerine tek seferde topluca çekiyoruz.
    """
    rows = session.query(Tender.external_id, Tender.tender_datetime).filter(Tender.source == source).all()
    return dict(rows)


def get_known_detail_urls(session: Session, source: str) -> set[str]:
    """Kocaeli gibi liste seviyesinde IKN/tarih vermeyen kaynaklar için:
    sadece detail_url'in DB'de olup olmadığına bakarak atlama kararı verir.
    """
    rows = session.query(Tender.detail_url).filter(Tender.source == source).all()
    return {row[0] for row in rows}


def touch_last_seen(session: Session, source: str, external_ids: list[str]) -> None:
    """Detay isteği atlanan (değişmemiş) kayıtların last_seen_at'ini topluca günceller."""
    if not external_ids:
        return
    session.query(Tender).filter(Tender.source == source, Tender.external_id.in_(external_ids)).update(
        {"last_seen_at": func.now()}, synchronize_session=False
    )
    session.commit()


def touch_last_seen_by_detail_url(session: Session, source: str, detail_urls: list[str]) -> None:
    if not detail_urls:
        return
    session.query(Tender).filter(Tender.source == source, Tender.detail_url.in_(detail_urls)).update(
        {"last_seen_at": func.now()}, synchronize_session=False
    )
    session.commit()
