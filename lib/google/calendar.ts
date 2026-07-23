import { getGoogleTokens, getGoogleConnection, updateGoogleConnectionMeta } from "@/lib/data/google-connections";
import type { ServiceDay } from "@/lib/types";

const CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";
const CALENDAR_NAME = "Flow par Minerva";

export type GoogleCalendarItem = {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
};

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

function eventIdFor(serviceDayId: string): string {
  return serviceDayId.replace(/-/g, "").toLowerCase();
}

/**
 * Creates or updates the Google Calendar event for a service day that has
 * events populated (soirées, promos).
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

/**
 * Bi-directional sync helper: reads events & unavailabilities from the Google Calendar
 * to detect scheduling conflicts for shifts, holidays & team availability.
 */
export async function fetchGoogleCalendarEvents(
  restaurantId: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarItem[]> {
  const [tokens, calendarId] = await Promise.all([
    getGoogleTokens(restaurantId),
    getOrCreateMinervaCalendar(restaurantId),
  ]);
  if (!tokens || !calendarId) return [];

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  if (timeMin) params.set("timeMin", timeMin);
  if (timeMax) params.set("timeMax", timeMax);

  const res = await fetch(
    `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  const items = data.items || [];

  return items.map((item: any) => ({
    id: item.id,
    summary: item.summary || "Événement Google Calendar",
    description: item.description,
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    isAllDay: Boolean(item.start?.date),
  }));
}
