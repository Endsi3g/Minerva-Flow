import { getGoogleTokens, getGoogleConnection, updateGoogleConnectionMeta } from "@/lib/data/google-connections";
import type { ServiceDay } from "@/lib/types";

const CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";
const CALENDAR_NAME = "Flow par Minerva";

/**
 * Returns the restaurant's dedicated Google Calendar id, creating it on
 * first use and persisting the id on google_connections.
 */
export async function getOrCreateMinervaCalendar(restaurantId: string): Promise<string | null> {
  const existing = await getGoogleConnection(restaurantId);
  if (existing?.calendarId) return existing.calendarId;

  const tokens = await getGoogleTokens(restaurantId);
  if (!tokens) return null;

  const res = await fetch(`${CALENDAR_BASE_URL}/calendars`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ summary: CALENDAR_NAME }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { id?: string };
  if (!data.id) return null;

  await updateGoogleConnectionMeta(restaurantId, { calendarId: data.id });
  return data.id;
}

/**
 * Google Calendar event ids must match [a-v0-9]{5,1024} — a service day's
 * UUID (hex + dashes) already satisfies that once dashes are stripped, so
 * reusing it as the event id makes create-or-update naturally idempotent
 * without a separate mapping table.
 */
function eventIdFor(serviceDayId: string): string {
  return serviceDayId.replace(/-/g, "").toLowerCase();
}

/**
 * Creates or updates the Google Calendar event for a service day that has
 * events populated (soirées, promos). No-op (returns false) if Calendar
 * isn't connected — callers must treat this as best-effort, never blocking
 * the underlying service_days write.
 */
export async function syncServiceDayEvent(restaurantId: string, serviceDay: ServiceDay): Promise<boolean> {
  if (serviceDay.events.length === 0) return false;

  const [tokens, calendarId] = await Promise.all([
    getGoogleTokens(restaurantId),
    getOrCreateMinervaCalendar(restaurantId),
  ]);
  if (!tokens || !calendarId) return false;

  const eventId = eventIdFor(serviceDay.id);
  const body = {
    summary: serviceDay.events.join(", "),
    description: serviceDay.notes || undefined,
    start: { date: serviceDay.date },
    end: { date: serviceDay.date },
  };

  const updateRes = await fetch(
    `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (updateRes.ok) return true;
  if (updateRes.status !== 404) return false;

  const createRes = await fetch(
    `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: eventId, ...body }),
    }
  );
  return createRes.ok;
}
