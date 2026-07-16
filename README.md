# BuyukSehir_Ihaleler

Türkiye'deki büyükşehir belediyelerinin ihale ilanlarını çeken, PostgreSQL'de
saklayan ve bir dashboard'da gösteren sistem.

## Yapı

- `backend/scraper/` — şehir bazlı scraper'lar, DB katmanı, CLI (Python)
- `backend/api/` — FastAPI backend (`/tenders` endpoint'leri)
- `frontend/` — dashboard (Next.js + TypeScript + Tailwind)

## Kurulum (backend)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # DB bağlantısını doldur
```

PostgreSQL'in kurulu ve `.env`'deki `DATABASE_URL`'in işaret ettiği
veritabanının var olması gerekiyor (`CREATE DATABASE ihaleler;`).

## Kurulum (frontend)

```bash
cd frontend
npm install
```

## Çalıştırma

Üç parça birbirinden bağımsız çalışır, aynı veritabanını paylaşırlar.

**1) Scraper'ları çalıştır** (veri çeker, DB'ye yazar):

```bash
cd backend
source .venv/bin/activate
python -m scraper run
```

**2) API'yi başlat** (`http://localhost:8000`, `/docs`'ta Swagger arayüzü):

```bash
cd backend
source .venv/bin/activate
uvicorn api.main:app --reload
```

**3) Dashboard'u başlat** (`http://localhost:3000`):

```bash
cd frontend
npm run dev
```
