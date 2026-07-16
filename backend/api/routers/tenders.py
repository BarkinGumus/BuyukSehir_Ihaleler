from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.deps import get_db
from api.schemas import TenderListOut, TenderOut
from scraper.db.models import Tender
from scraper.models import TenderType

router = APIRouter(prefix="/tenders", tags=["tenders"])


@router.get("", response_model=TenderListOut)
def list_tenders(
    db: Session = Depends(get_db),
    city: str | None = Query(None, description="İl adına göre filtrele (province), örn. İstanbul"),
    type: TenderType | None = Query(None, description="İhale türüne göre filtrele"),
    date_from: date | None = Query(None, description="Bu tarihten itibaren (dahil)"),
    date_to: date | None = Query(None, description="Bu tarihe kadar (dahil)"),
    search: str | None = Query(None, description="Başlıkta serbest metin arama"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> TenderListOut:
    query = db.query(Tender)

    if city:
        query = query.filter(Tender.province.ilike(city))
    if type:
        query = query.filter(Tender.tender_type == type.value)
    if date_from:
        query = query.filter(Tender.tender_datetime >= date_from)
    if date_to:
        query = query.filter(Tender.tender_datetime < date_to + timedelta(days=1))
    if search:
        query = query.filter(Tender.title.ilike(f"%{search}%"))

    total = query.count()
    items = (
        query.order_by(Tender.tender_datetime.asc())
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
