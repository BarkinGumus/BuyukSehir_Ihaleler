from sqlalchemy import func, literal_column
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scraper.db.models import Tender
from scraper.models import TenderRecord

_UPDATABLE_COLUMNS = (
    "ikn",
    "title",
    "tender_type",
    "procedure",
    "tender_datetime",
    "unit",
    "status",
    "description",
    "delivery_place",
    "duration",
    "venue",
    "address",
    "phone",
    "detail_url",
    "doc_url",
    "raw_data",
)


def upsert_tender(session: Session, record: TenderRecord) -> bool:
    """Kaydı ekler ya da (source, external_id) çakışırsa günceller.

    Yeni eklendiyse True, mevcut kayıt güncellendiyse False döner.
    """
    values = record.model_dump()
    values["tender_type"] = record.tender_type.value

    stmt = insert(Tender).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["source", "external_id"],
        set_={col: stmt.excluded[col] for col in _UPDATABLE_COLUMNS}
        | {"last_seen_at": func.now()},
    ).returning(literal_column("(xmax = 0)").label("inserted"))

    return session.execute(stmt).scalar_one()
