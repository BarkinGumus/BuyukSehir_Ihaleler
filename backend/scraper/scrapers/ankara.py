import re
import time
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from scraper.config import MIN_TENDER_DATE
from scraper.models import TenderRecord, TenderType
from scraper.scrapers.base import BaseScraper
from scraper.text_utils import extract_procedure

LIST_URL = "https://www.ankara.bel.tr/ihaleler"
DETAIL_URL_TEMPLATE = "https://www.ankara.bel.tr/ihaleler/detay/{id}"
REQUEST_DELAY_SECONDS = 0.3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

_TYPE_MAP = {
    "Mal Alımı": TenderType.MAL_ALIMI,
    "Hizmet Alımı": TenderType.HIZMET_ALIMI,
    "Yapım İşi": TenderType.YAPIM_ISI,
    "Taşınmaz Mal": TenderType.TASINMAZ_SATIS,
    "Taşınmaz Kiralama": TenderType.KIRALAMA,
    "Kat Karşılığı": TenderType.KAT_KARSILIGI,
}

def _parse_datetime(text: str) -> datetime | None:
    text = text.strip()
    if not text:
        return None
    try:
        return datetime.strptime(text, "%d.%m.%Y %H:%M")
    except ValueError:
        return None


def _parse_list_item(item) -> dict:
    strong = item.find("strong")
    title = strong.get_text(strip=True) if strong else None

    values = {}
    for attr in item.select(".attribute"):
        label = attr.find("label")
        span = attr.find("span")
        if label and span:
            values[label.get_text(strip=True).rstrip(":")] = span.get_text(strip=True)

    button = item.find("a", class_="btn")
    detail_href = button["href"] if button else None
    detail_id = detail_href.rstrip("/").rsplit("/", 1)[-1] if detail_href else None

    tender_type_label = values.get("İhale Türü")

    return {
        "title": title,
        "tender_datetime": _parse_datetime(values.get("İhale Tarihi", "")),
        "ikn": values.get("İhale Kayıt No") or None,
        "tender_type": _TYPE_MAP.get(tender_type_label, TenderType.DIGER),
        "tender_type_label": tender_type_label,
        "unit": values.get("İlgili Birim"),
        "detail_id": detail_id,
    }


def _parse_detail(html: str) -> tuple[dict, str]:
    soup = BeautifulSoup(html, "html.parser")

    values = {}
    for div in soup.select(".tender-detail .item"):
        label = div.find("div", class_="label")
        info = div.find("div", class_="info")
        if label:
            text = info.get_text(" ", strip=True) if info else ""
            text = re.sub(r"\s+", " ", text)
            values[label.get_text(strip=True)] = text or None

    ilan_metni = ""
    for card in soup.select(".card"):
        title_el = card.find(class_="card-title")
        if title_el and "İhale Metni" in title_el.get_text():
            body = card.find(class_="card-body")
            ilan_metni = body.get_text(" ", strip=True) if body else ""
            ilan_metni = re.sub(r"\s+", " ", ilan_metni)
            break

    return values, ilan_metni


def _to_tender_record(list_item: dict, detail_values: dict, ilan_metni: str) -> TenderRecord:
    detail_id = list_item["detail_id"]
    ikn = list_item["ikn"] or detail_values.get("KİK Kayıt No")

    procedure_source = " ".join(
        filter(None, [detail_values.get("İhale Kısa Özeti"), ilan_metni])
    )

    return TenderRecord(
        source="ankara",
        external_id=ikn or detail_id,
        ikn=ikn,
        title=detail_values.get("İhale Konusu") or list_item["title"],
        tender_type=list_item["tender_type"],
        procedure=extract_procedure(procedure_source),
        tender_datetime=list_item["tender_datetime"],
        unit=detail_values.get("İhale Birimi") or list_item["unit"],
        status=None,
        description=detail_values.get("İhale Konusu Hizmetin Niteliği, Türü ve Miktarı")
        or detail_values.get("İhale Kısa Özeti"),
        delivery_place=detail_values.get("Teslim Yeri"),
        duration=None,
        venue=detail_values.get("İhale'nin Yapılacağı Adres"),
        address=detail_values.get("İdare'nin Adresi"),
        phone=detail_values.get("İdare'nin Telefonu"),
        detail_url=DETAIL_URL_TEMPLATE.format(id=detail_id),
        doc_url=None,
        raw_data={
            **{k: v for k, v in detail_values.items() if v},
            "ihale_turu": list_item.get("tender_type_label") or "",
            "ilan_metni": ilan_metni,
        },
    )


def _iter_list_items(client: httpx.Client, max_pages: int | None = None):
    """ankara.bel.tr/ihaleler sayfalarını tarihe göre azalan sırada dolaşır.

    Liste tarihe göre azalan sırada olduğu için, bir sayfada MIN_TENDER_DATE'den
    eski hiç kayıt kalmadığında sayfalamayı durduruyoruz - 203 sayfanın tamamını
    çekmeye gerek yok.
    """
    page = 1
    while True:
        resp = client.get(LIST_URL, params={"page": page})
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select(".tender-list-item")
        if not items:
            break

        any_recent = False
        for item in items:
            parsed = _parse_list_item(item)
            if parsed["tender_datetime"] and parsed["tender_datetime"].date() >= MIN_TENDER_DATE:
                any_recent = True
                yield parsed

        if not any_recent:
            break
        if max_pages is not None and page >= max_pages:
            break

        page += 1
        time.sleep(REQUEST_DELAY_SECONDS)


class AnkaraScraper(BaseScraper):
    source_name = "ankara"

    def __init__(self, max_pages: int | None = None):
        self.max_pages = max_pages

    def fetch(self) -> list[TenderRecord]:
        records = []
        with httpx.Client(headers=HEADERS, timeout=30) as client:
            for list_item in _iter_list_items(client, max_pages=self.max_pages):
                resp = client.get(DETAIL_URL_TEMPLATE.format(id=list_item["detail_id"]))
                resp.raise_for_status()
                detail_values, ilan_metni = _parse_detail(resp.text)
                records.append(_to_tender_record(list_item, detail_values, ilan_metni))
                time.sleep(REQUEST_DELAY_SECONDS)
        return records
