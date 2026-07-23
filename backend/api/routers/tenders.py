from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, distinct, func
from sqlalchemy.orm import Session

from api.auth import require_admin
from api.deps import get_db
from api.schemas import TenderFilterOptionsOut, TenderListOut, TenderOut, TenderStatsOut, TenderUpdate
from scraper.db.models import Tender
from scraper.models import TenderType
from scraper.text_utils import turkish_lower, turkish_sort_key

router = APIRouter(prefix="/tenders", tags=["tenders"])

TenderStatusFilter = Literal["aktif", "gecmis"]


@router.get("/stats", response_model=TenderStatsOut)
def get_tender_stats(db: Session = Depends(get_db)) -> TenderStatsOut:
    # tender_datetime timezone'suz saklanıyor, first_seen_at timezone'lu -
    # ikisini karşılaştırırken doğru tipte "now" kullanmak gerekiyor.
    now_naive = datetime.now()
    now_aware = datetime.now(timezone.utc)
    seven_days_ago = now_aware - timedelta(days=7)
    thirty_days_ahead = now_naive + timedelta(days=30)

    total = db.query(Tender).count()
    new_count = db.query(Tender).filter(Tender.first_seen_at >= seven_days_ago).count()
    upcoming_count = (
        db.query(Tender)
        .filter(Tender.tender_datetime.isnot(None))
        .filter(Tender.tender_datetime >= now_naive, Tender.tender_datetime <= thirty_days_ahead)
        .count()
    )
    source_count = db.query(func.count(distinct(Tender.source))).scalar() or 0

    return TenderStatsOut(
        total=total,
        new_count=new_count,
        upcoming_count=upcoming_count,
        source_count=source_count,
    )


def _dedupe_case_insensitive(values: list[str]) -> list[str]:
    """Aynı şehir farklı kaynaklardan farklı harf biçimiyle geliyor
    (İstanbul / İSTANBUL) - filtreleme zaten ilike ile harf duyarsız
    çalışıyor ama açılır listede tekrar görünmesin diye tek biçime indiriyoruz.
    Tamamı büyük harf olmayan (örn. Title Case) biçim tercih ediliyor.
    """
    by_key: dict[str, str] = {}
    for value in values:
        key = turkish_lower(value)
        current = by_key.get(key)
        if current is None or (current.isupper() and not value.isupper()):
            by_key[key] = value
    return sorted(by_key.values(), key=turkish_sort_key)


@router.get("/filter-options", response_model=TenderFilterOptionsOut)
def get_filter_options(db: Session = Depends(get_db)) -> TenderFilterOptionsOut:
    raw_cities = [
        row[0]
        for row in db.query(distinct(Tender.province)).filter(Tender.province.isnot(None)).all()
    ]
    procedures = [
        row[0]
        for row in db.query(distinct(Tender.procedure))
        .filter(Tender.procedure.isnot(None))
        .order_by(Tender.procedure)
        .all()
    ]
    sources = [row[0] for row in db.query(distinct(Tender.source)).order_by(Tender.source).all()]
    institutions = [
        row[0]
        for row in db.query(distinct(Tender.institution))
        .filter(Tender.institution.isnot(None))
        .order_by(Tender.institution)
        .all()
    ]
    units = [
        row[0]
        for row in db.query(distinct(Tender.unit))
        .filter(Tender.unit.isnot(None))
        .order_by(Tender.unit)
        .all()
    ]
    return TenderFilterOptionsOut(
        cities=_dedupe_case_insensitive(raw_cities),
        procedures=procedures,
        sources=sources,
        institutions=institutions,
        units=units,
    )


@router.get("", response_model=TenderListOut)
def list_tenders(
    db: Session = Depends(get_db),
    city: str | None = Query(None, description="İl adına göre filtrele (province), örn. İstanbul"),
    source: str | None = Query(None, description="Kaynağa göre filtrele, örn. istanbul, ilan_gov_tr"),
    type: TenderType | None = Query(None, description="İhale türüne göre filtrele"),
    procedure: str | None = Query(None, description="İhale usulüne göre filtrele"),
    status: TenderStatusFilter | None = Query(None, description="aktif (yaklaşan) / gecmis"),
    date_from: date | None = Query(None, description="Bu tarihten itibaren (dahil)"),
    date_to: date | None = Query(None, description="Bu tarihe kadar (dahil)"),
    search: str | None = Query(None, description="Başlıkta serbest metin arama"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> TenderListOut:
    query = db.query(Tender)

    if city:
        query = query.filter(Tender.province.ilike(city))
    if source:
        query = query.filter(Tender.source == source)
    if type:
        query = query.filter(Tender.tender_type == type.value)
    if procedure:
        query = query.filter(Tender.procedure == procedure)
    if status:
        query = query.filter(Tender.tender_datetime.isnot(None))
        now = datetime.now()
        if status == "aktif":
            query = query.filter(Tender.tender_datetime >= now)
        else:
            query = query.filter(Tender.tender_datetime < now)
    if date_from:
        query = query.filter(Tender.tender_datetime >= date_from)
    if date_to:
        query = query.filter(Tender.tender_datetime < date_to + timedelta(days=1))
    if search:
        query = query.filter(Tender.title.ilike(f"%{search}%"))

    total = query.count()
    # Önce aktif (yaklaşan) ihaleler, sonra geçmiş ihaleler gelsin - her iki
    # grubun kendi içi de tarihe göre artan sırada (aktifte en yakın tarihli üstte).
    is_past = case((Tender.tender_datetime < datetime.now(), 1), else_=0)
    items = (
        query.order_by(is_past, Tender.tender_datetime.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return TenderListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{tender_id}", response_model=TenderOut)
def get_tender(tender_id: int, db: Session = Depends(get_db)) -> Tender:
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="İhale bulunamadı")
    return tender


@router.put("/{tender_id}", response_model=TenderOut, dependencies=[Depends(require_admin)])
def update_tender(tender_id: int, update: TenderUpdate, db: Session = Depends(get_db)) -> Tender:
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="İhale bulunamadı")

    changes = update.model_dump(exclude_unset=True)
    if "tender_type" in changes and changes["tender_type"] is not None:
        changes["tender_type"] = changes["tender_type"].value
    for field, value in changes.items():
        setattr(tender, field, value)

    db.commit()
    db.refresh(tender)
    return tender


@router.delete("/{tender_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_tender(tender_id: int, db: Session = Depends(get_db)) -> None:
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="İhale bulunamadı")
    db.delete(tender)
    db.commit()
