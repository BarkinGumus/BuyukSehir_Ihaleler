import re
import ssl
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import certifi
import httpx
from bs4 import BeautifulSoup

from scraper.db.base import SessionLocal
from scraper.db.models import ScraperRun
from scraper.db.queries import get_known_tender_dates, touch_last_seen
from scraper.models import TenderRecord, TenderType
from scraper.scrapers.base import BaseScraper

SOURCE_NAME = "ilan_gov_tr"
SITE_BASE = "https://www.ilan.gov.tr"
LIST_URL = f"{SITE_BASE}/api/api/services/app/Ad/AdsByFilter"
DETAIL_URL = f"{SITE_BASE}/api/api/services/app/AdDetail/GetAdDetail"
TAX_ID_IHALE_DUYURULARI = 9
PAGE_SIZE = 20  # sunucu maxResultCount'u ne istenirse istensin sessizce buna sabitliyor
REQUEST_DELAY_SECONDS = 1.5

# ilan.gov.tr, sertifika zincirinde ara sertifikayı (GeoTrust TLS RSA CA G1) göndermiyor -
# bu sunucunun kendi yapılandırma hatası. Doğrulamayı kapatmak (verify=False) yerine,
# eksik halkayı certifi'nin güncel kök sertifika paketine ekleyerek tam doğrulama sağlıyoruz.
_INTERMEDIATE_CERT = Path(__file__).resolve().parent.parent / "certs" / "geotrust_tls_rsa_ca_g1.pem"


def _build_ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context(cafile=certifi.where())
    context.load_verify_locations(cafile=str(_INTERMEDIATE_CERT))
    return context


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Content-Type": "application/json-patch+json",
    "Accept": "text/plain",
}

_TYPE_MAP = {
    "Yapım İşi": TenderType.YAPIM_ISI,
    "Mal Alımı": TenderType.MAL_ALIMI,
    "Hizmet Alımı": TenderType.HIZMET_ALIMI,
    "Kiralama ve Hizmet Alımı": TenderType.HIZMET_ALIMI,
    "Kiraya Verme": TenderType.KIRALAMA,
    "Satış": TenderType.TASINMAZ_SATIS,
    "Kat Karşılığı": TenderType.KAT_KARSILIGI,
}


def _get_last_success() -> datetime | None:
    with SessionLocal() as session:
        row = session.get(ScraperRun, SOURCE_NAME)
        return row.last_success_at if row else None


def _set_last_success(when: datetime) -> None:
    with SessionLocal() as session:
        row = session.get(ScraperRun, SOURCE_NAME)
        if row:
            row.last_success_at = when
        else:
            session.add(ScraperRun(source=SOURCE_NAME, last_success_at=when))
        session.commit()


def _parse_facet_datetime(text: str | None) -> datetime | None:
    if not text:
        return None
    text = text.strip()
    for fmt in ("%d.%m.%Y %H:%M", "%d.%m.%Y"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _parse_ekap_table(html: str) -> dict:
    """EKAP tarzı '1.1. Adı : X' tablolarından etiket:değer çiftlerini çıkarır.

    Kocaeli'deki aynı mantık: numaralandırma etikette kalıyor (aynı kelime
    farklı bölümlerde tekrar ediyor). Bazı ilanlarda etiketteki boşluk normal
    değil, non-breaking space (\\xa0) - onu normal boşluğa çeviriyoruz.
    """
    soup = BeautifulSoup(html, "html.parser")
    values = {}
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) == 3:
                label = cells[0].get_text(" ", strip=True).replace("\xa0", " ")
                value = cells[2].get_text(" ", strip=True)
                if label and value:
                    values[label] = value
    return values


def _extract_plain_text(html: str) -> str:
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text)


def _to_tender_record(ad: dict, facets: dict, content_values: dict, content_text: str) -> TenderRecord:
    ikn = facets.get("İhale Kayıt No") or content_values.get("İhale Kayıt Numarası (İKN)")
    ad_id = str(ad["id"])

    raw_data = {
        **{k: v for k, v in content_values.items() if v},
        **{k: v for k, v in facets.items() if v},
        "advertiserName": ad.get("advertiserName") or "",
        "addressCityName": ad.get("addressCityName") or "",
        "addressCountyName": ad.get("addressCountyName") or "",
        "adNo": ad.get("adNo") or "",
        "icerik_metni": content_text,
    }

    return TenderRecord(
        source=SOURCE_NAME,
        external_id=ikn or ad_id,
        ikn=ikn,
        title=content_values.get("3.1. Adı") or ad.get("title"),
        tender_type=_TYPE_MAP.get(facets.get("İhale Türü"), TenderType.DIGER),
        procedure=facets.get("İhale Usulü"),
        tender_datetime=_parse_facet_datetime(facets.get("İhale ve Teklif Açma Tarihi")),
        unit=content_values.get("1.1. Adı"),
        status=None,
        description=content_values.get("3.2. Niteliği, türü ve miktarı") or content_text,
        delivery_place=content_values.get("3.3. Yapılacağı/teslim edileceği yer"),
        duration=content_values.get("3.4. Süresi/teslim tarihi"),
        venue=content_values.get("2.2. Yapılacağı (e-tekliflerin açılacağı) adres"),
        address=content_values.get("1.2. Adresi"),
        phone=content_values.get("1.3. Telefon numarası"),
        detail_url=f"{SITE_BASE}{ad.get('urlStr', '')}",
        doc_url=None,
        province=ad.get("addressCityName"),
        institution=ad.get("advertiserName"),
        raw_data=raw_data,
    )


def _iter_ads(client: httpx.Client, ppdmin: str | None):
    skip = 0
    while True:
        keys = {"txv": [TAX_ID_IHALE_DUYURULARI]}
        if ppdmin:
            keys["ppdmin"] = [ppdmin]

        resp = client.post(LIST_URL, json={"keys": keys, "skipCount": skip, "maxResultCount": PAGE_SIZE})
        resp.raise_for_status()
        result = resp.json()["result"]
        ads = result["ads"]
        if not ads:
            break

        yield from ads

        skip += len(ads)
        if skip >= result["numFound"]:
            break
        time.sleep(REQUEST_DELAY_SECONDS)


class IlanGovScraper(BaseScraper):
    source_name = SOURCE_NAME

    def __init__(self, max_records: int | None = None):
        self.max_records = max_records

    def fetch(self) -> list[TenderRecord]:
        last_success = _get_last_success()
        ppdmin = None
        if last_success:
            ppdmin = (last_success.date() - timedelta(days=1)).strftime("%d.%m.%Y")

        with SessionLocal() as session:
            known_dates = get_known_tender_dates(session, SOURCE_NAME)

        records = []
        unchanged_ids = []
        with httpx.Client(headers=HEADERS, timeout=30, verify=_build_ssl_context()) as client:
            for ad in _iter_ads(client, ppdmin):
                if self.max_records is not None and len(records) >= self.max_records:
                    break

                list_facets = {f["key"]: f["value"] for f in ad.get("adTypeFilters", [])}
                external_id = list_facets.get("İhale Kayıt No") or str(ad["id"])
                list_date = _parse_facet_datetime(list_facets.get("İhale ve Teklif Açma Tarihi"))

                # Liste sadece gün hassasiyetinde tarih veriyor (saat yok), o yüzden
                # sadece tarih kısmını karşılaştırıyoruz - detay isteği saat de verir.
                known_date = known_dates.get(external_id)
                if known_date and list_date and known_date.date() == list_date.date():
                    unchanged_ids.append(external_id)
                    continue

                detail_resp = client.get(DETAIL_URL, params={"id": ad["id"]})
                detail_resp.raise_for_status()
                detail = detail_resp.json()["result"]

                content_html = detail.get("content") or ""
                facets = {f["key"]: f["value"] for f in detail.get("adTypeFilters", [])}
                content_values = _parse_ekap_table(content_html)
                content_text = _extract_plain_text(content_html)
                records.append(_to_tender_record(ad, facets, content_values, content_text))
                time.sleep(REQUEST_DELAY_SECONDS)

        if unchanged_ids:
            with SessionLocal() as session:
                touch_last_seen(session, SOURCE_NAME, unchanged_ids)

        _set_last_success(datetime.now(timezone.utc))
        return records
