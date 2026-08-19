"""In-memory job store + subprocess runner.

Each scrape runs as its own `scrapy crawl <spider>` subprocess rather than
in-process — Scrapy/Twisted's reactor can only start once per process, so
running arbitrary numbers of jobs over a long-lived FastAPI server's lifetime
means subprocess isolation is the simplest correct option (it also means a
spider that hangs or crashes can't take the API down with it).

In-memory storage means jobs don't survive a restart and don't work across
multiple replicas — fine for a single small internal tool; swap for Redis if
this ever needs to scale out.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from typing import Literal, Optional

from scraper.normalize import empty_menu

logger = logging.getLogger("scraper.jobs")

SPIDER_BY_PLATFORM = {
    "uber_eats": "ubereats",
    "doordash": "doordash",
}
DEFAULT_SPIDER = "generic_site"

JOB_TIMEOUT_SECONDS = 60
JOB_TTL_SECONDS = 30 * 60  # stale jobs are swept so this doesn't leak memory forever


@dataclass
class Job:
    id: str
    status: Literal["processing", "done", "failed"] = "processing"
    menu: Optional[dict] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)


_jobs: dict[str, Job] = {}


def _sweep_stale_jobs() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    stale = [jid for jid, job in _jobs.items() if job.created_at < cutoff]
    for jid in stale:
        _jobs.pop(jid, None)


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def submit_job(url: str, platform: str) -> str:
    _sweep_stale_jobs()
    job_id = str(uuid.uuid4())
    _jobs[job_id] = Job(id=job_id)
    asyncio.create_task(_run_job(job_id, url, platform))
    return job_id


async def _run_job(job_id: str, url: str, platform: str) -> None:
    job = _jobs[job_id]
    spider_name = SPIDER_BY_PLATFORM.get(platform, DEFAULT_SPIDER)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        output_path = tmp.name

    try:
        proc = await asyncio.create_subprocess_exec(
            "scrapy",
            "crawl",
            spider_name,
            "-a",
            f"url={url}",
            "-a",
            f"output_path={output_path}",
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=JOB_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            proc.kill()
            job.status = "failed"
            job.error = "Le scraping a dépassé le délai maximum (60s)."
            return

        if proc.returncode != 0:
            logger.warning("Spider %s failed for %s: %s", spider_name, url, stderr.decode(errors="ignore")[-2000:])
            job.status = "failed"
            job.error = "Le spider a échoué — vérifiez l'URL ou collez le menu manuellement."
            return

        try:
            with open(output_path, "r", encoding="utf-8") as f:
                menu = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            menu = empty_menu()

        if not menu.get("categories"):
            job.status = "failed"
            job.error = "Aucun menu détecté sur cette page."
            return

        job.status = "done"
        job.menu = menu
    except Exception as exc:  # noqa: BLE001 — surface any failure as a job error, never crash the server
        logger.exception("Unexpected error running job %s", job_id)
        job.status = "failed"
        job.error = f"Erreur inattendue : {exc}"
    finally:
        try:
            os.unlink(output_path)
        except OSError:
            pass
