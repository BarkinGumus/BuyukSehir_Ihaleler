import time

import httpx
from bs4 import BeautifulSoup

from scraper.models import TenderRecord, TenderType
from scraper.scrapers.base import BaseScraper

API_URL = "https://webapi.ibb.istanbul/api/ihaleler"
DETAIL_URL_TEMPLATE = "https://ibb.istanbul/ibb/ihaleler/ihale-ilanlari/{slug}"
PAGE_SIZE = 100
REQUEST_DELAY_SECONDS = 0.3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

_TYPE_KEYWORDS = (
    ("hizmet alımı", TenderType.HIZMET_ALIMI),
    ("mal alımı", TenderType.MAL_ALIMI),
    ("yapım işi", TenderType.YAPIM_ISI),
    ("taşınmaz satışı", TenderType.TASINMAZ_SATIS),
    ("kiralama", TenderType.KIRALAMA),
    ("kat karşılığı", TenderType.KAT_KARSILIGI),
)


def _turkish_lower(text: str) -> str:
    """str.lower() Türkçe İ/I harflerini yanlış çevirir (örn. 'TAŞINMAZ' -> 'taşinmaz',
    doğrusu 'taşınmaz'); bu yüzden İ/I'yı önce elle değiştirip sonra lower() uyguluyoruz."""
    return text.replace("İ", "i").replace("I", "ı").lower()


def _classify_tender_type(text: str) -> TenderType:
    lowered = _turkish_lower(text)
    for keyword, tender_type in _TYPE_KEYWORDS:
        if keyword in lowered:
            return tender_type
    return TenderType.DIGER


def _extract_unit(ilan_metni: str) -> str | None:
    """İlan metninin '1-İdarenin ... a) Adı : X' tablosundan idare adını (birim) çıkarır."""
    soup = BeautifulSoup(ilan_metni, "html.parser")
    for cell in soup.find_all("td"):
        if "Adı" in cell.get_text():
            value_cell = cell.find_next("td").find_next("td")
            if value_cell:
                return value_cell.get_text(strip=True)
    return None


def _to_tender_record(item: dict) -> TenderRecord:
    attrs = item["attributes"]
    classify_source = " ".join(
        filter(None, [attrs.get("konu"), attrs.get("nitelikMiktar"), attrs.get("ilanMetni")])
    )

    return TenderRecord(
        source="istanbul",
        external_id=attrs.get("ikn") or attrs["slug"],
        ikn=attrs.get("ikn"),
        title=attrs["konu"],
        tender_type=_classify_tender_type(classify_source),
        procedure=attrs.get("usul"),
        tender_datetime=attrs.get("tarih"),
        unit=_extract_unit(attrs.get("ilanMetni") or ""),
        status=attrs.get("durum"),
        description=attrs.get("nitelikMiktar"),
        delivery_place=attrs.get("teslimYeri"),
        duration=attrs.get("teslimSuresi"),
        venue=attrs.get("ihaleYeri"),
        address=attrs.get("adres"),
        phone=attrs.get("telefon"),
        detail_url=DETAIL_URL_TEMPLATE.format(slug=attrs["slug"]),
        doc_url=None,
        raw_data={k: str(v) for k, v in attrs.items() if v is not None},
    )


def _iter_pages(page_size: int = PAGE_SIZE, max_pages: int | None = None):
    """webapi.ibb.istanbul/api/ihaleler'i sayfa sayfa dolaşıp ham kayıt dict'lerini verir."""
    page = 1
    with httpx.Client(headers=HEADERS, timeout=30) as client:
        while True:
            resp = client.get(
                API_URL,
                params={"pagination[page]": page, "pagination[pageSize]": page_size},
            )
            resp.raise_for_status()
            payload = resp.json()

            yield from payload["data"]

            pagination = payload["meta"]["pagination"]
            if pagination["page"] >= pagination["pageCount"]:
                break
            if max_pages is not None and page >= max_pages:
                break

            page += 1
            time.sleep(REQUEST_DELAY_SECONDS)


class IstanbulScraper(BaseScraper):
    source_name = "istanbul"

    def fetch(self) -> list[TenderRecord]:
        return [_to_tender_record(item) for item in _iter_pages()]
