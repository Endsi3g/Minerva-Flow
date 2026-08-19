# Minerva Menu Scraper

A small, separately-deployed Python service (Scrapy + Playwright, wrapped in FastAPI) that
auto-fills the "1-Click Ingestor" prospect generator's menu field from a URL. It is **additive**
to the existing manual-paste flow in the main Next.js app, never a replacement — every failure
mode here (unreachable site, no menu found, timeout) leaves the admin free to paste the menu
text by hand instead, exactly like today.

This lives outside the Next.js app on purpose: Scrapy needs a persistent Python process, which
doesn't fit Vercel's serverless model. Deploy it as its own container on Railway, Render, Fly.io,
or any host that runs a Dockerfile.

## Why this exists / what it targets

Three spiders, one per source type:

- **`generic_site`** — a restaurant's own website. Respects `robots.txt`. Reads schema.org
  `Restaurant`/`Menu` JSON-LD first (the same markup Google requires for rich snippets — by far
  the most reliable source when present), falling back to a heuristic scan for
  `"Dish name .... 12.50$"`-style text lines.
- **`ubereats`** / **`doordash`** — renders the page with a real headless browser (Playwright)
  and reads whatever JSON state the page embeds client-side (`__NEXT_DATA__`, Redux/Apollo state
  dumps, etc.), the standard approach for scraping a JS single-page app.

## ⚠️ Read before deploying the delivery-platform spiders

The `ubereats` and `doordash` spiders **deliberately ignore `robots.txt`** and are very likely
scraping in violation of those platforms' Terms of Service. This was an explicit, informed choice
made by the Minerva team (not an oversight) after being told plainly that:

- these platforms actively fight scraping (bot-detection, frequent markup changes) — expect
  this to break periodically and need maintenance;
- the exact JSON shape used here is a **generic, duck-typed guess** (`scraper/deep_json_scan.py`)
  written without live access to either site from the build environment that produced it — it
  was never verified against a real captured payload;
- this is a business/legal risk the operators of this tool are accepting, not something this
  codebase can absolve.

If a scrape against these two platforms fails, that's the expected steady state as much as a
bug — manual paste is the reliable fallback by design.

## Deployment

1. **Build & push**: this directory is a self-contained Docker build context.
   ```
   cd scraper-service
   docker build -t minerva-menu-scraper .
   ```
   On Railway/Render/Fly.io: point a new service at this directory (or this repo with a
   root/build path of `scraper-service/`) and let it build the Dockerfile directly — no extra
   config needed beyond the environment variable below.

2. **Set the shared secret**: generate a random string and set it as `SCRAPER_API_KEY` on the
   scraper service's environment. Every request must carry it as the `X-Scraper-Api-Key` header
   or the service rejects it (503 if unset server-side, 401 if the header doesn't match).

3. **Wire up the Next.js app**: on the Vercel project (or wherever the main app is deployed),
   set:
   - `SCRAPER_SERVICE_URL` — the scraper service's public base URL (e.g.
     `https://minerva-menu-scraper.up.railway.app`)
   - `SCRAPER_SERVICE_API_KEY` — the exact same value as `SCRAPER_API_KEY` above

   Without these two set, the "Scraper automatiquement" button in `/admin/prospects/new` just
   returns a clear error and the admin falls back to pasting the menu manually — nothing breaks.

## API

- `GET /health` → `{"status": "ok"}` (no auth)
- `POST /scrape` `{"url": "...", "platform": "uber_eats"|"doordash"|"direct_website"|"other"}`
  → `202 {"job_id": "..."}`. Returns immediately; the scrape runs as a background subprocess.
- `GET /scrape/{job_id}` → `{"status": "processing"}` or
  `{"status": "done", "menu": {...ProspectMenu shape...}}` or `{"status": "failed", "error": "..."}`

The `menu` shape mirrors `lib/prospects/types.ts`'s `ProspectMenu` exactly
(`app/schema.py`/`scraper/normalize.py` on this side) — keep the two in sync by hand if either
changes, there's no shared codegen between the Python and TypeScript sides.

## Local development

```
cd scraper-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload
```

Test a spider directly, bypassing the API:
```
scrapy crawl generic_site -a url=https://example-restaurant.com -a output_path=/tmp/out.json
cat /tmp/out.json
```

## Operational notes

- **Jobs are in-memory** and don't survive a restart or scale across replicas — fine for this
  tool's actual load (an admin clicking one button at a time); swap for Redis if that ever
  changes.
- **60-second hard timeout per job** (`app/jobs.py: JOB_TIMEOUT_SECONDS`) — a hung spider is
  killed and reported as a failure rather than left running.
- **No persistent storage of scraped content** — a job's result lives only in memory until it's
  fetched by the Next.js app and swept ~30 minutes later.
