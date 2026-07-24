from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import current_user_id
from api.deps import get_db
from api.schemas import TenderOut
from scraper.db.models import Favorite, Tender

router = APIRouter(prefix="/favorites", tags=["favorites"], dependencies=[Depends(current_user_id)])


@router.get("/ids", response_model=list[int])
def get_favorite_ids(
    db: Session = Depends(get_db), user_id: str = Depends(current_user_id)
) -> list[int]:
    """Hafif uç nokta - herhangi bir listede yıldızın dolu/boş görünmesi için
    sadece favorilenen id'leri döner, tam ihale verisini tekrar çekmez."""
    rows = db.query(Favorite.tender_id).filter(Favorite.user_id == user_id).all()
    return [r[0] for r in rows]


@router.get("", response_model=list[TenderOut])
def list_favorites(db: Session = Depends(get_db), user_id: str = Depends(current_user_id)) -> list[Tender]:
    return (
        db.query(Tender)
        .join(Favorite, Favorite.tender_id == Tender.id)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
        .all()
    )


@router.post("/{tender_id}", status_code=204)
def add_favorite(
    tender_id: int, db: Session = Depends(get_db), user_id: str = Depends(current_user_id)
) -> None:
    if not db.get(Tender, tender_id):
        raise HTTPException(status_code=404, detail="İhale bulunamadı")

    exists = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id, Favorite.tender_id == tender_id)
        .first()
    )
    if not exists:
        db.add(Favorite(user_id=user_id, tender_id=tender_id))
        db.commit()


@router.delete("/{tender_id}", status_code=204)
def remove_favorite(
    tender_id: int, db: Session = Depends(get_db), user_id: str = Depends(current_user_id)
) -> None:
    db.query(Favorite).filter(
        Favorite.user_id == user_id, Favorite.tender_id == tender_id
    ).delete(synchronize_session=False)
    db.commit()
