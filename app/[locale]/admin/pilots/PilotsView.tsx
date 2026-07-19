"use client";

import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/minerva/FormField";
import { updatePilotRequestStatusAction } from "./actions";
import type { PilotRequest } from "@/lib/data/pilot-requests";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { useTranslations } from "next-intl";

const statusTone: Record<PilotRequest["status"], "amber" | "neutral" | "green" | "red"> = {
  nouveau: "amber",
  contacte: "neutral",
  actif: "green",
  decline: "red",
};

function PilotRow({ pilot }: { pilot: PilotRequest }) {
  const t = useTranslations("admin.pilots.status");
  const [status, setStatus] = useState(pilot.status);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: PilotRequest["status"]) {
    setStatus(next);
    setSaving(true);
    await updatePilotRequestStatusAction(pilot.id, next);
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-display text-[15px] font-medium text-mv-ink">{pilot.restaurantName}</p>
        <Badge tone={statusTone[status]}>{t(status)}</Badge>
      </div>
      <p className="text-[12.5px] text-mv-ink-soft">
        {pilot.fullName} · {pilot.email}
        {pilot.city ? ` · ${pilot.city}` : ""}
      </p>
      {pilot.message && <p className="mt-2 text-[12.5px] text-mv-ink-soft">{pilot.message}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-mv-ink-faint">{formatDate(pilot.createdAt.slice(0, 10))}</span>
        <Select
          value={status}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as PilotRequest["status"])}
          className="h-8 w-36 text-[12.5px]"
        >
          {(["nouveau", "contacte", "actif", "decline"] as PilotRequest["status"][]).map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function PilotsView({ pilots }: { pilots: PilotRequest[] }) {
  const t = useTranslations("admin.pilots");
  if (pilots.length === 0) {
    return <p className="text-[13px] text-mv-ink-faint">{t("emptyState")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {pilots.map((p) => (
        <PilotRow key={p.id} pilot={p} />
      ))}
    </div>
  );
}
