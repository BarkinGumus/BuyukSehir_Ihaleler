import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient

from scraper.config import settings

_jwks_client = PyJWKClient(f"{settings.clerk_issuer}/.well-known/jwks.json")


def get_current_user(request: Request) -> dict:
    """Clerk'in verdiği JWT'yi (Authorization: Bearer <token>) doğrular.

    İmza, Clerk'in kendi JWKS'i (herkese açık anahtar seti) üzerinden
    kontrol ediliyor - CLERK_SECRET_KEY'e hiç ihtiyaç yok, sadece Clerk
    instance'ının adresini (CLERK_ISSUER) bilmemiz yeterli.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Yetkilendirme gerekli")

    token = auth_header.removeprefix("Bearer ")
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş oturum") from exc

    return payload


def require_admin(payload: dict = Depends(get_current_user)) -> dict:
    """Rol bilgisi, Clerk'te kullanıcının public metadata'sına eklenen
    'role' alanından okunuyor - bunun JWT'ye düşmesi için Clerk Dashboard'da
    session token'a public_metadata claim'i eklenmiş olması gerekiyor."""
    metadata = payload.get("public_metadata") or {}
    if metadata.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekiyor")
    return payload
