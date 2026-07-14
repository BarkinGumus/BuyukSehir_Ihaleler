# BuyukSehir_Ihaleler

Türkiye'deki büyükşehir belediyelerinin ihale ilanlarını çeken, PostgreSQL'de
saklayan ve bir dashboard'da gösteren sistem.

## Yapı

- `backend/scraper/` — şehir bazlı scraper'lar, DB katmanı, CLI (Python)
- `frontend/` — dashboard (Next.js, ileriki fazda)

## Kurulum (backend)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # DB bağlantısını doldur
```
