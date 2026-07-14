from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from scraper.db.base import Base


class Tender(Base):
    __tablename__ = "tenders"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_tenders_source_external_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    source: Mapped[str] = mapped_column(String(50))
    external_id: Mapped[str] = mapped_column(String(255))
    ikn: Mapped[str | None] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(Text)
    tender_type: Mapped[str] = mapped_column(String(30))
    procedure: Mapped[str | None] = mapped_column(String(255))
    tender_datetime: Mapped[datetime | None] = mapped_column(DateTime)
    unit: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    delivery_place: Mapped[str | None] = mapped_column(Text)
    duration: Mapped[str | None] = mapped_column(String(100))
    venue: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    detail_url: Mapped[str] = mapped_column(Text)
    doc_url: Mapped[str | None] = mapped_column(Text)
    raw_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
