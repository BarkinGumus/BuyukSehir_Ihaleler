from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TenderType(str, Enum):
    MAL_ALIMI = "mal_alimi"
    HIZMET_ALIMI = "hizmet_alimi"
    YAPIM_ISI = "yapim_isi"
    TASINMAZ_SATIS = "tasinmaz_satis"
    KIRALAMA = "kiralama"
    KAT_KARSILIGI = "kat_karsiligi"
    DIGER = "diger"


class TenderRecord(BaseModel):
    source: str
    external_id: str
    ikn: str | None = None
    title: str
    tender_type: TenderType
    procedure: str | None = None
    tender_datetime: datetime | None = None
    unit: str | None = None
    status: str | None = None
    description: str | None = None
    delivery_place: str | None = None
    duration: str | None = None
    venue: str | None = None
    address: str | None = None
    phone: str | None = None
    detail_url: str
    doc_url: str | None = None
    province: str | None = None
    institution: str | None = None
    raw_data: dict[str, str] = Field(default_factory=dict)
