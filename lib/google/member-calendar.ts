const CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";

export type UpcomingCalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
};

/** Next N upcoming events on the user's primary Google Calendar. Read-only scope. */
export async function fetchUpcomingEvents(
  accessToken: string,
  maxResults = 8
): Promise<UpcomingCalendarEvent[]> {
  const url = new URL(`${CALENDAR_BASE_URL}/calendars/primary/events`);
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  return (data.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? "(Sans titre)",
    start: e.start?.dateTime ?? e.start?.date ?? null,
    end: e.end?.dateTime ?? e.end?.date ?? null,
    allDay: !e.start?.dateTime,
  }));
}
