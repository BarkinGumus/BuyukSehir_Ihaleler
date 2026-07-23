from datetime import datetime

from pydantic import BaseModel, ConfigDict

from scraper.models import TenderType


class TenderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    external_id: str
    ikn: str | None
    title: str
    tender_type: TenderType
    procedure: str | None
    tender_datetime: datetime | None
    unit: str | None
    description: str | None
    delivery_place: str | None
    duration: str | None
    venue: str | None
    address: str | None
    phone: str | None
    detail_url: str
    doc_url: str | None
    province: str | None
    institution: str | None
    raw_data: dict
    first_seen_at: datetime
    last_seen_at: datetime


class TenderUpdate(BaseModel):
    """Admin düzenleme formunun gönderdiği alanlar - hepsi opsiyonel, sadece
    değiştirilen alanlar gönderilse de çalışır (exclude_unset ile)."""

    title: str | None = None
    tender_type: TenderType | None = None
    procedure: str | None = None
    tender_datetime: datetime | None = None
    unit: str | None = None
    description: str | None = None
    delivery_place: str | None = None
    duration: str | None = None
    venue: str | None = None
    address: str | None = None
    phone: str | None = None
    detail_url: str | None = None
    doc_url: str | None = None
    province: str | None = None
    institution: str | None = None


class TenderListOut(BaseModel):
    items: list[TenderOut]
    total: int
    page: int
    page_size: int


class TenderStatsOut(BaseModel):
    total: int
    new_count: int
    upcoming_count: int
    source_count: int


class TenderFilterOptionsOut(BaseModel):
    cities: list[str]
    procedures: list[str]
    sources: list[str]
