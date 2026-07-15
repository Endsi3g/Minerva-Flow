"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Alert, AlertSeverity } from "@/lib/types";
import { useEffect, useState } from "react";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const severityTone: Record<AlertSeverity, "red" | "amber" | "neutral"> = {
  critique: "red",
  important: "amber",
  info: "neutral",
};

const severityLabel: Record<AlertSeverity, string> = {
  critique: "Priorité haute",
  important: "À surveiller",
  info: "Info",
};

type AlertRow = {
  id: string;
  restaurant_id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  status: "nouvelle" | "revue" | "assignee";
  assigned_to: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};

function mapAlertRow(row: AlertRow): Alert {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    severity: row.severity,
    date: row.created_at.slice(0, 10),
    restaurantId: row.restaurant_id,
    type: row.type,
    status: row.status,
    assignedTo: row.assigned_to,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
  };
}

/**
 * Overview "Alertes" card. Seeded server-side with the rule engine's
 * computed alerts plus any unread rows already in `alerts`, then subscribes
 * to realtime INSERTs on `alerts` for this restaurant so newly persisted
 * alerts appear instantly without a page reload.
 */
export function LiveAlertsPanel({
  restaurantId,
  initial,
  className,
}: {
  restaurantId: string;
  initial: Alert[];
  className?: string;
}) {
  const [alerts, setAlerts] = useState(initial);

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`overview-alerts-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as AlertRow;
          setAlerts((prev) => [mapAlertRow(row), ...prev.filter((a) => a.id !== row.id)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return (
    <Card className={cn("flex flex-col h-full xl:sticky xl:top-6", className)}>
      <CardHeader
        title="Alertes"
        description={`${alerts.length} à examiner`}
        action={
          <Link href="/settings?tab=alertes" className="text-mv-green-dark hover:text-mv-green transition-colors">
            <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto min-h-0">
        {alerts.length === 0 ? (
          <p className="text-[12.5px] text-mv-ink-faint">Rien à signaler pour l&apos;instant.</p>
        ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div
              key={a.id}
              style={{ animationDelay: `${220 + i * 50}ms` }}
              className="mv-animate-in rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3.5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Badge tone={severityTone[a.severity]} dot>
                  {severityLabel[a.severity]}
                </Badge>
                <span className="text-[11px] text-mv-ink-faint">{formatDate(a.date)}</span>
              </div>
              <p className="text-[13px] font-semibold leading-snug text-mv-ink">{a.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-mv-ink-soft">{a.detail}</p>
            </div>
          ))}
        </div>
      )}
      </div>
    </Card>
  );
}
