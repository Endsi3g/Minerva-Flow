import os

from fastapi import Header, HTTPException

# Shared secret with the Next.js app (SCRAPER_SERVICE_API_KEY there, same
# value here). If unset, the service refuses all requests rather than
# silently running open — this is an internal service, never meant to be
# public.
_API_KEY = os.environ.get("SCRAPER_API_KEY")


async def require_api_key(x_scraper_api_key: str | None = Header(default=None)) -> None:
    if not _API_KEY:
        raise HTTPException(status_code=503, detail="SCRAPER_API_KEY is not configured on this service.")
    if x_scraper_api_key != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
