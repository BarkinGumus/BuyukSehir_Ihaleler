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
    status: str | None
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


class TenderListOut(BaseModel):
    items: list[TenderOut]
    total: int
    page: int
    page_size: int
