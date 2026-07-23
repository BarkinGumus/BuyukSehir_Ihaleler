from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from api.auth import require_admin
from scraper.cli import run_one
from scraper.scrapers.registry import SCRAPERS

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

_SOURCE_MAP = {s.source_name: s for s in SCRAPERS}

JobStatus = Literal["idle", "running", "done", "error"]

# Tek process içinde tutulan basit bir durum sözlüğü - admin panelinin
# "çekiliyor mu" animasyonunu göstermesi için yeterli, ayrı bir job kuyruğu
# (Celery vb.) bu projenin ölçeği için gereksiz karmaşıklık olurdu.
_job_state: dict[str, dict] = {
    source: {"status": "idle", "result": None, "error": None, "finished_at": None}
    for source in _SOURCE_MAP
}


def _run_and_record(source: str) -> None:
    _job_state[source] = {"status": "running", "result": None, "error": None, "finished_at": None}
    try:
        result = run_one(_SOURCE_MAP[source])
        _job_state[source] = {
            "status": "done",
            "result": result,
            "error": None,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:  # scraper hatası admin panelinde görünsün diye yakalanıyor
        _job_state[source] = {
            "status": "error",
            "result": None,
            "error": str(exc),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }


@router.get("/scrapers/status")
def get_scrapers_status() -> dict[str, dict]:
    return _job_state


@router.post("/scrapers/{source}/run")
def trigger_scraper(source: str, background_tasks: BackgroundTasks) -> dict:
    if source == "all":
        already_running = [s for s in _SOURCE_MAP if _job_state[s]["status"] == "running"]
        if already_running:
            raise HTTPException(status_code=409, detail=f"Zaten çalışıyor: {', '.join(already_running)}")
        for s in _SOURCE_MAP:
            background_tasks.add_task(_run_and_record, s)
        return {"started": list(_SOURCE_MAP)}

    if source not in _SOURCE_MAP:
        raise HTTPException(status_code=404, detail=f"Bilinmeyen kaynak: {source}")
    if _job_state[source]["status"] == "running":
        raise HTTPException(status_code=409, detail="Bu kaynak zaten çalışıyor")

    background_tasks.add_task(_run_and_record, source)
    return {"started": [source]}
