import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Literal

from typing_extensions import TypedDict

from fastapi import APIRouter, Depends, HTTPException

from api.auth import require_admin
from scraper.cli import run_one
from scraper.scrapers.registry import SCRAPERS

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

_SOURCE_MAP = {s.source_name: s for s in SCRAPERS}

JobStatus = Literal["idle", "running", "done", "error"]


class ScraperResult(TypedDict):
    source: str
    new_count: int
    updated_count: int
    skipped: int
    total_fetched: int


class JobState(TypedDict):
    status: JobStatus
    result: ScraperResult | None
    error: str | None
    finished_at: str | None


def _idle_state() -> JobState:
    return {"status": "idle", "result": None, "error": None, "finished_at": None}


# run_one() (scraper.cli) tamamen senkron/bloklayıcı - httpx istekleri ve
# SQLAlchemy sorguları asyncio'ya uyarlanmamış. Bu yüzden paralellik için
# asyncio task'ı değil gerçek OS thread'i gerekiyor: I/O beklerken (HTTP
# isteği, DB round-trip) Python GIL'i serbest bırakır, böylece 4 kaynak
# gerçekten aynı anda ilerleyebilir. max_workers = kaynak sayısı, "Tümünü
# Çek" tetiklendiğinde hiçbiri sırasını beklemeden hemen başlasın diye.
_executor = ThreadPoolExecutor(max_workers=len(_SOURCE_MAP), thread_name_prefix="scraper-run")

# _job_state hem worker thread'leri (kendi sonucunu yazarken) hem ana thread
# (GET /status okurken, POST /run "çalışıyor mu" kontrolü yaparken) tarafından
# eşzamanlı kullanılıyor - tüm okuma/yazmalar _job_lock ile korunuyor.
_job_lock = threading.Lock()
_job_state: dict[str, JobState] = {source: _idle_state() for source in _SOURCE_MAP}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _set_state(source: str, **fields: object) -> None:
    with _job_lock:
        _job_state[source] = {**_job_state[source], **fields}  # type: ignore[misc]


def _run_and_record(source: str) -> None:
    """Thread havuzunda çalışan asıl iş - run_one() hiç değişmedi, sadece
    sonucu/hatası kilit altında _job_state'e yazılıyor."""
    try:
        result = run_one(_SOURCE_MAP[source])
        _set_state(source, status="done", result=result, finished_at=_now_iso())
    except Exception as exc:  # scraper hatası admin panelinde görünsün diye yakalanıyor
        _set_state(source, status="error", error=str(exc), finished_at=_now_iso())


def _try_start(source: str) -> bool:
    """Kaynak boştaysa durumu atomik olarak 'running' yapıp thread havuzuna
    gönderir, True döner. Zaten çalışıyorsa hiçbir şey yapmadan False döner.

    Kontrol ("çalışıyor mu?") ve durum değişikliği ("running yap") TEK bir
    kilit altında yapılıyor - ayrı adımlar olsaydı iki eşzamanlı istek aynı
    kaynağı iki kere başlatabilirdi (check-then-act race condition)."""
    with _job_lock:
        if _job_state[source]["status"] == "running":
            return False
        _job_state[source] = {"status": "running", "result": None, "error": None, "finished_at": None}
    _executor.submit(_run_and_record, source)
    return True


@router.get("/scrapers/status")
def get_scrapers_status() -> dict[str, JobState]:
    with _job_lock:
        return dict(_job_state)


@router.post("/scrapers/{source}/run")
def trigger_scraper(source: str) -> dict:
    if source == "all":
        # Zaten çalışan kaynaklar atlanır, boşta olanlar hemen (paralel) başlar -
        # tek bir kaynağın meşgul olması "Tümünü Çek"in tamamını engellemesin.
        started = [s for s in _SOURCE_MAP if _try_start(s)]
        if not started:
            raise HTTPException(status_code=409, detail="Tüm kaynaklar zaten çalışıyor")
        return {"started": started}

    if source not in _SOURCE_MAP:
        raise HTTPException(status_code=404, detail=f"Bilinmeyen kaynak: {source}")
    if not _try_start(source):
        raise HTTPException(status_code=409, detail="Bu kaynak zaten çalışıyor")
    return {"started": [source]}
