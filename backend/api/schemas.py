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


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkDeleteOut(BaseModel):
    deleted: int


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
    institutions: list[str] = []
    units: list[str] = []


class KpiOut(BaseModel):
    total: int
    today_added: int
    active: int
    ending_today: int
    institution_count: int
    this_month_total: int
    last_month_total: int
    month_over_month_pct: float | None


class CountBucket(BaseModel):
    label: str
    count: int


class TrendsOut(BaseModel):
    granularity: str
    series: list[CountBucket]
    by_weekday: list[CountBucket]
    by_month_of_year: list[CountBucket]
    avg_publish_lead_days: float | None


class ProvinceTypeBucket(BaseModel):
    province: str
    tender_type: TenderType
    count: int


class GeographyOut(BaseModel):
    by_province: list[CountBucket]
    by_province_and_type: list[ProvinceTypeBucket]


class InstitutionUnitBucket(BaseModel):
    institution: str
    unit: str | None
    count: int


class InstitutionMonthlyBucket(BaseModel):
    institution: str
    month: str
    count: int


class InstitutionsOut(BaseModel):
    top_institutions: list[CountBucket]
    top_institution_units: list[InstitutionUnitBucket]
    institution_monthly: list[InstitutionMonthlyBucket]


class KeywordBucket(BaseModel):
    word: str
    count: int


class ContentOut(BaseModel):
    by_tender_type: list[CountBucket]
    by_procedure: list[CountBucket]
    top_keywords: list[KeywordBucket]
