import httpx

from scraper.config import settings

_BASE_URL = "https://api.clerk.com/v1"


def _client() -> httpx.Client:
    return httpx.Client(
        base_url=_BASE_URL,
        headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        timeout=10,
    )


def _primary_email(user: dict) -> str | None:
    primary_id = user.get("primary_email_address_id")
    for email in user.get("email_addresses", []):
        if email.get("id") == primary_id:
            return email.get("email_address")
    return None


def list_users() -> list[dict]:
    """Clerk Dashboard'daki kullanıcı listesini çeker - id, e-posta ve
    public_metadata.role bizim ilgilendiğimiz kısım."""
    with _client() as client:
        resp = client.get("/users", params={"limit": 100})
        resp.raise_for_status()
        users = resp.json()

    return [
        {
            "id": u["id"],
            "email": _primary_email(u),
            "role": (u.get("public_metadata") or {}).get("role", "viewer"),
        }
        for u in users
    ]


def update_user_role(user_id: str, role: str) -> None:
    """Clerk'in metadata güncelleme davranışı (merge/replace) sürüme göre
    değişebildiği için, veri kaybı olmasın diye önce mevcut metadata'yı
    okuyup üzerine yazıyoruz - sadece 'role' alanını değil tamamını gönderiyoruz."""
    with _client() as client:
        resp = client.get(f"/users/{user_id}")
        resp.raise_for_status()
        current_metadata = resp.json().get("public_metadata") or {}

        updated_metadata = {**current_metadata, "role": role}
        resp = client.patch(f"/users/{user_id}/metadata", json={"public_metadata": updated_metadata})
        resp.raise_for_status()
