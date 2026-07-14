import re
import time

import httpx
from bs4 import BeautifulSoup

from scraper.config import MIN_TENDER_DATE
from scraper.models import TenderRecord
from scraper.scrapers.base import BaseScraper
from scraper.text_utils import classify_tender_type

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



_PHONE_RE = re.compile(
    r"Telefon(?:\s+ve\s+faks)?\s+numaras[ıi]\s*:\s*(.+?)"
    r"(?=\s+[a-zçğıöşüA-ZÇĞİÖŞÜ]\)|\s+\d+\.\d+\.|\s{2,}|$)",
    re.IGNORECASE,
)


def _extract_phone(ilan_metni: str, fallback: str | None) -> str | None:
    """Telefonu ilanMetni'nden çeker; API'nin düz 'telefon' alanı bazı kayıtlarda
    yanlışlıkla IKN içeriyor (kullanıcı bunu fark etti), ilanMetni'ndeki metin
    daha güvenilir. Bazı ilan şablonlarında (örn. taşınmaz satışı, 'Tel: ...'
    şeklinde) bu kalıp uyuşmuyor; o durumda API'nin alanına geri dönüyoruz.
    """
    text = BeautifulSoup(ilan_metni, "html.parser").get_text(separator=" ")
    text = re.sub(r"\s+", " ", text)
    match = _PHONE_RE.search(text)
    if match:
        return match.group(1).strip()
    return fallback


def _extract_unit(ilan_metni: str) -> str | None:
    """İlan metninin '1-İdarenin ... a) Adı : X' tablosundan idare adını (birim) çıkarır.

    Arama, "İdarenin" başlığını içeren tabloyla sınırlı tutuluyor; aksi halde
    bazı ilanlarda bu tabloda "a) Adı" satırı hiç olmadığından (direkt "a) Adresi"
    ile başlıyor), arama belgenin ilerisindeki alakasız bir tabloya (örn. iş
    kalemi açıklamaları) kayıp çöp değer döndürebiliyor.
    """
    soup = BeautifulSoup(ilan_metni, "html.parser")
    for table in soup.find_all("table"):
        if "İdarenin" not in table.get_text():
            continue
        for cell in table.find_all("td"):
            if "Adı" in cell.get_text():
                value_cell = cell.find_next("td").find_next("td")
                if value_cell:
                    return value_cell.get_text(strip=True)
        return None
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
        tender_type=classify_tender_type(classify_source),
        procedure=attrs.get("usul"),
        tender_datetime=attrs.get("tarih"),
        unit=_extract_unit(attrs.get("ilanMetni") or ""),
        status=attrs.get("durum"),
        description=attrs.get("nitelikMiktar"),
        delivery_place=attrs.get("teslimYeri"),
        duration=attrs.get("teslimSuresi"),
        venue=attrs.get("ihaleYeri"),
        address=attrs.get("adres"),
        phone=_extract_phone(attrs.get("ilanMetni") or "", fallback=attrs.get("telefon")),
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
                params={
                    "pagination[page]": page,
                    "pagination[pageSize]": page_size,
                    "filters[tarih][$gte]": f"{MIN_TENDER_DATE.isoformat()}T00:00:00.000Z",
                },
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

    def __init__(self, max_pages: int | None = None):
        self.max_pages = max_pages

    def fetch(self) -> list[TenderRecord]:
        return [_to_tender_record(item) for item in _iter_pages(max_pages=self.max_pages)]
