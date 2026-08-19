from fastapi import Depends, FastAPI, HTTPException

from .auth import require_api_key
from .jobs import get_job, submit_job
from .schema import ScrapeRequest, ScrapeStatusResponse, ScrapeSubmitResponse

app = FastAPI(title="Minerva Menu Scraper", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/scrape", response_model=ScrapeSubmitResponse, dependencies=[Depends(require_api_key)])
async def scrape(request: ScrapeRequest):
    job_id = submit_job(request.url, request.platform)
    return ScrapeSubmitResponse(job_id=job_id)


@app.get("/scrape/{job_id}", response_model=ScrapeStatusResponse, dependencies=[Depends(require_api_key)])
async def scrape_status(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job_id.")
    return ScrapeStatusResponse(status=job.status, menu=job.menu, error=job.error)
