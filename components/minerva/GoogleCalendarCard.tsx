"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import {
  getMyCalendarConnectionAction,
  disconnectMyCalendarAction,
  getMyUpcomingCalendarEventsAction,
} from "@/app/(app)/profil/actions";
import type { UpcomingCalendarEvent } from "@/lib/google/member-calendar";
import { useEffect, useState } from "react";
import { GoogleCalendar } from "@thesvg/react";

function formatEventTime(event: UpcomingCalendarEvent) {
  if (!event.start) return "";
  if (event.allDay) return new Date(event.start).toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  return new Date(event.start).toLocaleString("fr-CA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleCalendarCard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<UpcomingCalendarEvent[]>([]);

  useEffect(() => {
    getMyCalendarConnectionAction().then((c) => {
      setConnected(c.connected);
      setEmail(c.googleEmail);
      if (c.connected) getMyUpcomingCalendarEventsAction().then(setEvents);
    });
  }, []);

  async function handleDisconnect() {
    await disconnectMyCalendarAction();
    setConnected(false);
    setEvents([]);
  }

  if (connected === null) return null;

  return (
    <Card>
      <CardHeader
        eyebrow="Personnel"
        title="Mon calendrier Google"
        description="Voyez vos événements à venir directement dans Flow — vous seul y avez accès."
      />
      {!connected ? (
        <a
          href="/api/oauth/google-calendar"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-mv-ink px-3 py-2 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-ink/90"
        >
          <GoogleCalendar width={14} height={14} /> Connecter mon Google Calendar
        </a>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Badge tone="green" dot>
              {email ?? "Connecté"}
            </Badge>
            <button onClick={handleDisconnect} className="text-[11.5px] font-medium text-mv-ink-faint hover:text-mv-red hover:underline">
              Déconnecter
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-[12.5px] text-mv-ink-faint">Aucun événement à venir.</p>
          ) : (
            <div className="space-y-1.5">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
                  <span className="truncate text-[12.5px] font-medium text-mv-ink">{e.title}</span>
                  <span className="shrink-0 text-[11.5px] text-mv-ink-faint">{formatEventTime(e)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
