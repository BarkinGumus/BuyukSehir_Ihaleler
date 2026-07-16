import re
import time
from datetime import datetime, timedelta

import httpx
from bs4 import BeautifulSoup

from scraper.config import MIN_TENDER_DATE
from scraper.db.base import SessionLocal
from scraper.db.queries import get_known_detail_urls, touch_last_seen_by_detail_url
from scraper.models import TenderRecord
from scraper.scrapers.base import BaseScraper
from scraper.text_utils import classify_tender_type, extract_procedure

LOADER_URL = "https://www.kocaeli.bel.tr/theme/kbb/notice_category_loader.php"
CATEGORY_ID = 26
CATEGORY_NAME = "İhale Duyuruları"
BATCH_SIZE = 50
REQUEST_DELAY_SECONDS = 0.3

# Liste sayfasındaki tarih, ihalenin kendi tarihi değil haberin YAYIN tarihi.
# İhaleler genelde yayından haftalar sonra yapıldığından, sayfalamayı MIN_TENDER_DATE'in
# tam sınırında değil biraz daha geriden durduruyoruz - asıl kesin filtre cli.run()'da
# gerçek tender_datetime (detay sayfasından) üzerinden uygulanıyor.
_PAGINATION_SAFETY_MARGIN = timedelta(days=60)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}


def _parse_list_date(text: str) -> datetime | None:
    text = text.strip()
    if not text:
        return None
    try:
        return datetime.strptime(text, "%d-%m-%Y %H:%M")
    except ValueError:
        return None


def _parse_ekap_datetime(text: str | None) -> datetime | None:
    if not text:
        return None
    try:
        return datetime.strptime(text.strip(), "%d.%m.%Y - %H:%M")
    except ValueError:
        return None


def _parse_list_card(card) -> dict:
    href = card.get("href")
    title_el = card.find(class_="card-title")
    title = title_el.get_text(strip=True) if title_el else None
    date_el = card.find("p", class_="card-text")
    publish_date = _parse_list_date(date_el.get_text(strip=True) if date_el else "")

    detail_id = None
    if href:
        m = re.search(r"-(\d+)\.html$", href)
        detail_id = m.group(1) if m else None

    return {
        "title": title,
        "detail_url": href,
        "publish_date": publish_date,
        "detail_id": detail_id,
    }


def _parse_detail(html: str) -> tuple[dict, str]:
    """EKAP tarzı '1.1. Adı : X' tablolarından etiket:değer çiftlerini çıkarır.

    Numaralandırmayı (1.1, 3.1 gibi) etiketten atmıyoruz çünkü aynı kelime
    ("Adı") birden fazla bölümde tekrar ediyor (idare adı vs. iş adı);
    numara ile birlikte anahtar tuttuğumuzda çakışma olmuyor.
    """
    soup = BeautifulSoup(html, "html.parser")
    content = soup.find(class_="content")

    values = {}
    if content:
        for table in content.find_all("table"):
            for row in table.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) == 3:
                    label = cells[0].get_text(" ", strip=True)
                    value = cells[2].get_text(" ", strip=True)
                    if label and value:
                        values[label] = value

    full_text = content.get_text(" ", strip=True) if content else ""
    full_text = re.sub(r"\s+", " ", full_text)
    return values, full_text


def _to_tender_record(list_item: dict, detail_values: dict, full_text: str) -> TenderRecord:
    ikn = detail_values.get("İhale Kayıt Numarası (İKN)")
    tender_datetime = _parse_ekap_datetime(detail_values.get("2.1. Tarih ve Saati")) or list_item[
        "publish_date"
    ]

    return TenderRecord(
        source="kocaeli",
        external_id=ikn or list_item["detail_id"],
        ikn=ikn,
        title=detail_values.get("3.1. Adı") or list_item["title"],
        tender_type=classify_tender_type(full_text or list_item["title"] or ""),
        procedure=extract_procedure(full_text),
        tender_datetime=tender_datetime,
        unit=detail_values.get("1.1. Adı"),
        status=None,
        description=detail_values.get("3.2. Niteliği, türü ve miktarı"),
        delivery_place=detail_values.get("3.3. Yapılacağı/teslim edileceği yer"),
        duration=detail_values.get("3.4. Süresi/teslim tarihi"),
        venue=detail_values.get("2.2. Yapılacağı (e-tekliflerin açılacağı) adres"),
        address=detail_values.get("1.2. Adresi"),
        phone=detail_values.get("1.3. Telefon numarası"),
        detail_url=list_item["detail_url"],
        doc_url=None,
        province="Kocaeli",
        institution="Kocaeli Büyükşehir Belediyesi",
        raw_data={
            **{k: v for k, v in detail_values.items() if v},
            "tam_metin": full_text,
        },
    )


def _iter_list_items(client: httpx.Client, max_batches: int | None = None):
    cutoff = MIN_TENDER_DATE - _PAGINATION_SAFETY_MARGIN
    start = 0
    batch_no = 0
    while True:
        resp = client.post(
            LOADER_URL,
            data={
                "start": start,
                "offset": BATCH_SIZE,
                "category": CATEGORY_ID,
                "category_name": CATEGORY_NAME,
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        cards = BeautifulSoup(payload.get("html", ""), "html.parser").select("a.card")
        if not cards:
            break

        any_recent = False
        for card in cards:
            parsed = _parse_list_card(card)
            if parsed["publish_date"] and parsed["publish_date"].date() >= cutoff:
                any_recent = True
                yield parsed

        returned_count = payload.get("status", 0)
        batch_no += 1
        if not any_recent or returned_count < BATCH_SIZE:
            break
        if max_batches is not None and batch_no >= max_batches:
            break

        start += BATCH_SIZE
        time.sleep(REQUEST_DELAY_SECONDS)


class KocaeliScraper(BaseScraper):
    source_name = "kocaeli"

    def __init__(self, max_batches: int | None = None):
        self.max_batches = max_batches

    def fetch(self) -> list[TenderRecord]:
        with SessionLocal() as session:
            known_urls = get_known_detail_urls(session, self.source_name)

        records = []
        unchanged_urls = []
        with httpx.Client(headers=HEADERS, timeout=30) as client:
            for list_item in _iter_list_items(client, max_batches=self.max_batches):
                # Liste sadece haberin YAYIN tarihini veriyor (ihalenin kendi tarihini
                # değil, bkz. modül docstring'i), o yüzden tarih karşılaştırması
                # güvenilir değil. Bunun yerine: bu haberi daha önce hiç gördük mü?
                # Kocaeli'nin haber sayfaları yayınlandıktan sonra pratikte değişmiyor.
                if list_item["detail_url"] in known_urls:
                    unchanged_urls.append(list_item["detail_url"])
                    continue

                resp = client.get(list_item["detail_url"])
                resp.raise_for_status()
                detail_values, full_text = _parse_detail(resp.text)
                records.append(_to_tender_record(list_item, detail_values, full_text))
                time.sleep(REQUEST_DELAY_SECONDS)

        if unchanged_urls:
            with SessionLocal() as session:
                touch_last_seen_by_detail_url(session, self.source_name, unchanged_urls)

        return records
