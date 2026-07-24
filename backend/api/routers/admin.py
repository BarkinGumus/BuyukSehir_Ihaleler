import logging
import threading
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel
from typing_extensions import TypedDict

from fastapi import APIRouter, Depends, HTTPException

from api import clerk_client
from api.auth import get_current_user, require_admin
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
    logs: list[str]


def _idle_state() -> JobState:
    return {"status": "idle", "result": None, "error": None, "finished_at": None, "logs": []}


# Her scraper çalışması kendi thread'inde koşuyor (bkz. _executor) - bu thread-local,
# "şu an bu thread hangi kaynağı çalıştırıyor" bilgisini tutuyor ki aşağıdaki log
# handler'ı, root logger'a gelen HER log satırını (httpx'in "HTTP Request: ..."
# satırları dahil) doğru kaynağın tamponuna yönlendirebilsin.
_log_context = threading.local()
_LOG_BUFFER_SIZE = 300
_log_buffers: dict[str, deque[str]] = {source: deque(maxlen=_LOG_BUFFER_SIZE) for source in _SOURCE_MAP}


class _SourceLogHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        source = getattr(_log_context, "source", None)
        if source is None:
            return
        _log_buffers[source].append(self.format(record))


_log_handler = _SourceLogHandler()
_log_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S"))
logging.getLogger().addHandler(_log_handler)


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
    sonucu/hatası kilit altında _job_state'e yazılıyor. _log_context.source
    ayarlanınca, bu thread'de basılan her log satırı (httpx'in "HTTP Request:
    ..." satırları dahil) otomatik olarak bu kaynağın tamponuna düşüyor."""
    _log_context.source = source
    try:
        result = run_one(_SOURCE_MAP[source])
        _set_state(source, status="done", result=result, finished_at=_now_iso())
    except Exception as exc:  # scraper hatası admin panelinde görünsün diye yakalanıyor
        _log_buffers[source].append(f"HATA: {exc}")
        _set_state(source, status="error", error=str(exc), finished_at=_now_iso())
    finally:
        _log_context.source = None


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
    _log_buffers[source].clear()
    _executor.submit(_run_and_record, source)
    return True


@router.get("/scrapers/status")
def get_scrapers_status() -> dict[str, JobState]:
    with _job_lock:
        state = dict(_job_state)
    return {
        source: {**job, "logs": list(_log_buffers[source])}  # type: ignore[misc]
        for source, job in state.items()
    }


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


class UserOut(BaseModel):
    id: str
    email: str | None
    role: Literal["admin", "viewer"]


class UpdateRoleRequest(BaseModel):
    role: Literal["admin", "viewer"]


@router.get("/users", response_model=list[UserOut])
def list_users() -> list[dict]:
    return clerk_client.list_users()


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    body: UpdateRoleRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    # Tek admin olan biri kendi rolünü yanlışlıkla kaldırıp kilitlenmesin diye.
    if current_user.get("sub") == user_id:
        raise HTTPException(status_code=400, detail="Kendi rolünü değiştiremezsin")
    clerk_client.update_user_role(user_id, body.role)
    return {"ok": True}
