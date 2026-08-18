import "server-only";
import type { ProspectMenu, ProspectSourcePlatform } from "./types";

// Talks to the separate Scrapy/FastAPI scraper service (scraper-service/) — never
// deployed as part of this Next.js app itself. Not configured => graceful "unavailable"
// error, never a crash; the admin always has manual paste as a fallback.
const SERVICE_URL = process.env.SCRAPER_SERVICE_URL;
const SERVICE_API_KEY = process.env.SCRAPER_SERVICE_API_KEY;

function authHeaders(): Record<string, string> {
  return SERVICE_API_KEY ? { "X-Scraper-Api-Key": SERVICE_API_KEY } : {};
}

export type ScrapeSubmitResult = { jobId: string } | { error: string };
export type ScrapeStatusResult =
  | { status: "processing" }
  | { status: "done"; menu: ProspectMenu }
  | { status: "failed"; error: string };

export async function submitScrapeJob(
  url: string,
  platform: ProspectSourcePlatform
): Promise<ScrapeSubmitResult> {
  if (!SERVICE_URL) {
    return { error: "Le service de scraping n'est pas configuré sur cet environnement." };
  }

  try {
    const res = await fetch(`${SERVICE_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ url, platform }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { error: `Le service de scraping a répondu avec une erreur (${res.status}).` };
    }
    const data = (await res.json()) as { job_id?: string };
    if (!data.job_id) return { error: "Réponse invalide du service de scraping." };
    return { jobId: data.job_id };
  } catch {
    return { error: "Impossible de joindre le service de scraping." };
  }
}

export async function getScrapeJobStatus(jobId: string): Promise<ScrapeStatusResult> {
  if (!SERVICE_URL) {
    return { status: "failed", error: "Le service de scraping n'est pas configuré." };
  }

  try {
    const res = await fetch(`${SERVICE_URL}/scrape/${encodeURIComponent(jobId)}`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      return { status: "failed", error: `Le service de scraping a répondu avec une erreur (${res.status}).` };
    }
    const data = (await res.json()) as {
      status: "processing" | "done" | "failed";
      menu?: ProspectMenu;
      error?: string;
    };

    if (data.status === "processing") return { status: "processing" };
    if (data.status === "done") {
      if (!data.menu || data.menu.categories.length === 0) {
        return { status: "failed", error: "Aucun menu détecté sur cette page." };
      }
      return { status: "done", menu: data.menu };
    }
    return { status: "failed", error: data.error || "Le scraping a échoué." };
  } catch {
    return { status: "failed", error: "Impossible de joindre le service de scraping." };
  }
}
