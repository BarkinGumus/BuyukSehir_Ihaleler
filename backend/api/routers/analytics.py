import re
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, distinct, func
from sqlalchemy.orm import Query as ORMQuery, Session

from api.deps import get_db
from api.schemas import (
    ContentOut,
    CountBucket,
    GeographyOut,
    InstitutionMonthlyBucket,
    InstitutionsOut,
    InstitutionUnitBucket,
    KeywordBucket,
    KpiOut,
    ProvinceTypeBucket,
    TrendsOut,
)
from scraper.db.models import Tender
from scraper.models import TenderType
from scraper.text_utils import turkish_lower

router = APIRouter(prefix="/analytics", tags=["analytics"])

Granularity = Literal["day", "week", "month", "year"]


@dataclass
class AnalyticsFilters:
    """Tüm /analytics endpoint'lerinin ortak filtresi - dashboard'daki filtre
    çubuğu değişince hepsi aynı parametrelerle yeniden sorgulanıyor."""

    city: str | None
    source: str | None
    type: TenderType | None
    procedure: str | None
    institution: str | None
    unit: str | None
    date_from: date | None
    date_to: date | None


def get_analytics_filters(
    city: str | None = Query(None, description="İl adına göre filtrele (province)"),
    source: str | None = Query(None, description="Kaynağa göre filtrele"),
    type: TenderType | None = Query(None, description="İhale türüne göre filtrele"),
    procedure: str | None = Query(None, description="İhale usulüne göre filtrele"),
    institution: str | None = Query(None, description="Kurum adında serbest metin arama"),
    unit: str | None = Query(None, description="Birim adında serbest metin arama"),
    date_from: date | None = Query(None, description="İhale tarihi bu tarihten itibaren (dahil)"),
    date_to: date | None = Query(None, description="İhale tarihi bu tarihe kadar (dahil)"),
) -> AnalyticsFilters:
    return AnalyticsFilters(city, source, type, procedure, institution, unit, date_from, date_to)


def _apply_filters(query: ORMQuery, filters: AnalyticsFilters) -> ORMQuery:
    """/tenders'daki list_tenders ile aynı filtre mantığı - 6 endpoint'in hepsi
    bunu paylaşıyor, tekrar yazılmıyor."""
    if filters.city:
        query = query.filter(Tender.province.ilike(filters.city))
    if filters.source:
        query = query.filter(Tender.source == filters.source)
    if filters.type:
        query = query.filter(Tender.tender_type == filters.type.value)
    if filters.procedure:
        query = query.filter(Tender.procedure == filters.procedure)
    if filters.institution:
        query = query.filter(Tender.institution.ilike(f"%{filters.institution}%"))
    if filters.unit:
        query = query.filter(Tender.unit.ilike(f"%{filters.unit}%"))
    if filters.date_from:
        query = query.filter(Tender.tender_datetime >= filters.date_from)
    if filters.date_to:
        query = query.filter(Tender.tender_datetime < filters.date_to + timedelta(days=1))
    return query


def _month_bounds(today: date) -> tuple[date, date, date]:
    this_month_start = today.replace(day=1)
    next_month_start = (this_month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    if this_month_start.month == 1:
        last_month_start = this_month_start.replace(year=this_month_start.year - 1, month=12)
    else:
        last_month_start = this_month_start.replace(month=this_month_start.month - 1)
    return last_month_start, this_month_start, next_month_start


@router.get("/kpis", response_model=KpiOut)
def get_kpis(
    db: Session = Depends(get_db),
    filters: AnalyticsFilters = Depends(get_analytics_filters),
) -> KpiOut:
    now = datetime.now()
    today = date.today()
    last_month_start, this_month_start, next_month_start = _month_bounds(today)

    filtered = _apply_filters(
        db.query(
            Tender.id,
            Tender.first_seen_at,
            Tender.tender_datetime,
            Tender.institution,
        ),
        filters,
    ).subquery()

    # Tek sorguda koşullu sayım (conditional aggregation) - 6-7 ayrı COUNT
    # sorgusu atmak yerine tüm KPI'lar aynı anda, tek tablo taramasıyla hesaplanıyor.
    row = db.query(
        func.count().label("total"),
        func.count(case((func.date(filtered.c.first_seen_at) == today, 1))).label("today_added"),
        func.count(case((filtered.c.tender_datetime >= now, 1))).label("active"),
        func.count(case((func.date(filtered.c.tender_datetime) == today, 1))).label("ending_today"),
        func.count(distinct(filtered.c.institution)).label("institution_count"),
        func.count(
            case(
                (
                    and_(
                        filtered.c.first_seen_at >= this_month_start,
                        filtered.c.first_seen_at < next_month_start,
                    ),
                    1,
                )
            )
        ).label("this_month_total"),
        func.count(
            case(
                (
                    and_(
                        filtered.c.first_seen_at >= last_month_start,
                        filtered.c.first_seen_at < this_month_start,
                    ),
                    1,
                )
            )
        ).label("last_month_total"),
    ).one()

    pct = None
    if row.last_month_total > 0:
        pct = round((row.this_month_total - row.last_month_total) / row.last_month_total * 100, 1)

    return KpiOut(
        total=row.total,
        today_added=row.today_added,
        active=row.active,
        ending_today=row.ending_today,
        institution_count=row.institution_count,
        this_month_total=row.this_month_total,
        last_month_total=row.last_month_total,
        month_over_month_pct=pct,
    )


@router.get("/trends", response_model=TrendsOut)
def get_trends(
    granularity: Granularity = Query("day"),
    db: Session = Depends(get_db),
    filters: AnalyticsFilters = Depends(get_analytics_filters),
) -> TrendsOut:
    # Trend serileri "sisteme ne zaman eklendi" (first_seen_at) üzerinden -
    # tender_datetime ihalenin son tarihi/teklif tarihi, aylara göre düzensiz
    # ileri tarihlere yayılıyor, "kaç ihale çıktı" trendini yansıtmaz.
    bucket = func.date_trunc(granularity, Tender.first_seen_at).label("bucket")
    series_rows = (
        _apply_filters(db.query(bucket, func.count().label("count")), filters)
        .group_by(bucket)
        .order_by(bucket)
        .all()
    )
    series = [CountBucket(label=r.bucket.date().isoformat(), count=r.count) for r in series_rows]

    weekday = func.extract("isodow", Tender.first_seen_at).label("weekday")
    weekday_rows = (
        _apply_filters(db.query(weekday, func.count().label("count")), filters)
        .group_by(weekday)
        .order_by(weekday)
        .all()
    )
    weekday_names = {
        1: "Pazartesi",
        2: "Salı",
        3: "Çarşamba",
        4: "Perşembe",
        5: "Cuma",
        6: "Cumartesi",
        7: "Pazar",
    }
    by_weekday = [
        CountBucket(label=weekday_names[int(r.weekday)], count=r.count) for r in weekday_rows
    ]

    month_of_year = func.extract("month", Tender.first_seen_at).label("month_of_year")
    month_rows = (
        _apply_filters(db.query(month_of_year, func.count().label("count")), filters)
        .group_by(month_of_year)
        .order_by(month_of_year)
        .all()
    )
    month_names = {
        1: "Ocak",
        2: "Şubat",
        3: "Mart",
        4: "Nisan",
        5: "Mayıs",
        6: "Haziran",
        7: "Temmuz",
        8: "Ağustos",
        9: "Eylül",
        10: "Ekim",
        11: "Kasım",
        12: "Aralık",
    }
    by_month_of_year = [
        CountBucket(label=month_names[int(r.month_of_year)], count=r.count) for r in month_rows
    ]

    # "Yayın süresi" = ihale tarihine kadar bizim ne kadar önceden fark ettiğimiz
    # (first_seen_at -> tender_datetime); kurumun resmi ilan tarihi değil, yaklaşık bir gösterge.
    avg_lead = (
        _apply_filters(db.query(Tender), filters)
        .filter(Tender.tender_datetime.isnot(None), Tender.tender_datetime >= Tender.first_seen_at)
        .with_entities(
            func.avg(func.extract("epoch", Tender.tender_datetime - Tender.first_seen_at) / 86400)
        )
        .scalar()
    )

    return TrendsOut(
        granularity=granularity,
        series=series,
        by_weekday=by_weekday,
        by_month_of_year=by_month_of_year,
        avg_publish_lead_days=round(avg_lead, 1) if avg_lead is not None else None,
    )


@router.get("/geography", response_model=GeographyOut)
def get_geography(
    db: Session = Depends(get_db),
    filters: AnalyticsFilters = Depends(get_analytics_filters),
) -> GeographyOut:
    province_rows = (
        _apply_filters(db.query(Tender.province, func.count().label("count")), filters)
        .filter(Tender.province.isnot(None))
        .group_by(Tender.province)
        .order_by(func.count().desc())
        .all()
    )
    by_province = [CountBucket(label=r.province, count=r.count) for r in province_rows]

    province_type_rows = (
        _apply_filters(
            db.query(Tender.province, Tender.tender_type, func.count().label("count")), filters
        )
        .filter(Tender.province.isnot(None))
        .group_by(Tender.province, Tender.tender_type)
        .order_by(func.count().desc())
        .all()
    )
    by_province_and_type = [
        ProvinceTypeBucket(province=r.province, tender_type=r.tender_type, count=r.count)
        for r in province_type_rows
    ]

    return GeographyOut(by_province=by_province, by_province_and_type=by_province_and_type)


@router.get("/institutions", response_model=InstitutionsOut)
def get_institutions(
    db: Session = Depends(get_db),
    filters: AnalyticsFilters = Depends(get_analytics_filters),
    limit: int = Query(15, ge=1, le=50),
) -> InstitutionsOut:
    top_institution_rows = (
        _apply_filters(db.query(Tender.institution, func.count().label("count")), filters)
        .filter(Tender.institution.isnot(None))
        .group_by(Tender.institution)
        .order_by(func.count().desc())
        .limit(limit)
        .all()
    )
    top_institutions = [CountBucket(label=r.institution, count=r.count) for r in top_institution_rows]

    top_unit_rows = (
        _apply_filters(
            db.query(Tender.institution, Tender.unit, func.count().label("count")), filters
        )
        .filter(Tender.unit.isnot(None))
        .group_by(Tender.institution, Tender.unit)
        .order_by(func.count().desc())
        .limit(limit)
        .all()
    )
    top_institution_units = [
        InstitutionUnitBucket(institution=r.institution, unit=r.unit, count=r.count)
        for r in top_unit_rows
    ]

    # Sadece en çok ihale veren ilk 5 kurum için aylık seri - hepsi için
    # hesaplamak hem gereksiz hem de payload'ı şişirir.
    top5 = [b.label for b in top_institutions[:5]]
    institution_monthly: list[InstitutionMonthlyBucket] = []
    if top5:
        month_bucket = func.date_trunc("month", Tender.first_seen_at).label("month")
        monthly_rows = (
            _apply_filters(
                db.query(Tender.institution, month_bucket, func.count().label("count")), filters
            )
            .filter(Tender.institution.in_(top5))
            .group_by(Tender.institution, month_bucket)
            .order_by(month_bucket)
            .all()
        )
        institution_monthly = [
            InstitutionMonthlyBucket(
                institution=r.institution, month=r.month.date().isoformat()[:7], count=r.count
            )
            for r in monthly_rows
        ]

    return InstitutionsOut(
        top_institutions=top_institutions,
        top_institution_units=top_institution_units,
        institution_monthly=institution_monthly,
    )


_STOPWORDS = {
    "ve", "ile", "için", "bir", "bu", "da", "de", "ki", "mi", "mu", "mü", "mı",
    "veya", "olan", "olarak", "üzere", "göre", "gibi", "ise", "her", "en", "çok",
    "daha", "kadar", "sonra", "önce", "ya", "ama", "fakat", "ancak", "değil",
    "var", "yok", "ve/veya", "tüm", "diğer", "adet", "no", "nolu",
    # İhale metinlerinde neredeyse her başlıkta geçen, ayırt edici olmayan
    # prosedür kelimeleri - anahtar kelime listesini domine etmesinler diye çıkarıldı.
    "ihale", "ihalesi", "ihaleler", "işi", "işleri", "alımı", "alım", "hizmeti",
    "hizmet", "hizmetleri", "yapım", "yapımı", "temin", "temini", "mal", "satın",
    "yapılması", "ilanı", "yapılacaktır", "kapsamında",
    # Gerçek test verisinde (bkz. /analytics/content çıktısı) sık geçen ama
    # konuyu değil sadece dilbilgisel eki/prosedürü belirten ek kelimeler.
    "alınacaktır", "alınacak", "yaptırılacaktır", "yaptırılacak", "satılacaktır",
    "kiralanacaktır", "müdürlüğü", "müdürlüğüne", "başkanlığı", "başkanlığının",
    "ilçesi", "ili", "yılı", "kullanılmak", "kullanılacak", "muhtelif", "kalem",
    "kalemi",
}
_WORD_RE = re.compile(r"[a-zçğıöşüA-ZÇĞİÖŞÜ]+")


@router.get("/content", response_model=ContentOut)
def get_content(
    db: Session = Depends(get_db),
    filters: AnalyticsFilters = Depends(get_analytics_filters),
) -> ContentOut:
    type_rows = (
        _apply_filters(db.query(Tender.tender_type, func.count().label("count")), filters)
        .group_by(Tender.tender_type)
        .order_by(func.count().desc())
        .all()
    )
    by_tender_type = [CountBucket(label=r.tender_type, count=r.count) for r in type_rows]

    procedure_rows = (
        _apply_filters(db.query(Tender.procedure, func.count().label("count")), filters)
        .filter(Tender.procedure.isnot(None))
        .group_by(Tender.procedure)
        .order_by(func.count().desc())
        .limit(10)
        .all()
    )
    by_procedure = [CountBucket(label=r.procedure, count=r.count) for r in procedure_rows]

    # Anahtar kelime sıklığı SQL'de değil Python'da hesaplanıyor (tokenize etmek
    # SQL GROUP BY ile doğal değil) - sadece başlık kolonu çekiliyor, satır sayısı
    # büyürse (>5000) örnekleme yapılıyor ki bellek/süre patlamasın.
    titles = [
        r[0]
        for r in _apply_filters(db.query(Tender.title), filters).limit(5000).all()
    ]
    counter: Counter[str] = Counter()
    for title in titles:
        for word in _WORD_RE.findall(title):
            lowered = turkish_lower(word)
            if len(lowered) >= 3 and lowered not in _STOPWORDS:
                counter[lowered] += 1

    top_keywords = [KeywordBucket(word=w, count=c) for w, c in counter.most_common(30)]

    return ContentOut(
        by_tender_type=by_tender_type,
        by_procedure=by_procedure,
        top_keywords=top_keywords,
    )
