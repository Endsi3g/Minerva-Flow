"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { roleLabels } from "@/lib/app-context";
import { formatRelativeTime } from "@/lib/utils";
import { getMemberActivityAction } from "./actions";
import { useActivityLogRealtime, type ActivityLogRow } from "@/hooks/use-activity-log-realtime";
import type { ActivityLogEntry, TeamMember } from "@/lib/types";
import { History } from "lucide-react";

function toActivityLogEntry(row: ActivityLogRow, actorName: string): ActivityLogEntry {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    actorId: row.actor_id,
    actorName,
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function MemberDetailModal({
  restaurantId = "",
  member,
  onClose,
  open,
}: {
  restaurantId?: string;
  member: TeamMember | null;
  onClose: () => void;
  open?: boolean;
}) {
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    const memberId = member.id;
    let cancelled = false;
    getMemberActivityAction(restaurantId, memberId).then((entries) => {
      if (!cancelled) {
        setActivity(entries);
        setLoadedFor(memberId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, member]);

  // Subscribed for as long as the modal is mounted (not just while open),
  // filtered by restaurant_id per the realtime contract. New rows are only
  // appended when they belong to the currently selected member.
  useActivityLogRealtime("restaurant_id", restaurantId, (row) => {
    if (!member || row.actor_id !== member.id) return;
    setActivity((prev) => {
      if (prev.some((entry) => entry.id === row.id)) return prev;
      return [toActivityLogEntry(row, member.name), ...prev];
    });
  });

  const loading = member ? loadedFor !== member.id : false;

  if (!member) return null;

  return (
    <Modal open={Boolean(member)} onClose={onClose} title="Activité du collaborateur" width={520}>
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={member.name} src={member.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-medium text-mv-ink">{member.name}</p>
          <p className="truncate text-[12.5px] text-mv-ink-faint">{member.email}</p>
        </div>
        <Badge tone={member.role === "owner" || member.role === "manager" ? "green" : "lime"}>
          {roleLabels[member.role]}
        </Badge>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto">
        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">Chargement…</p>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <History size={20} className="text-mv-ink-faint" />
            <p className="text-[12.5px] text-mv-ink-faint">
              Aucune activité enregistrée pour ce collaborateur.
            </p>
          </div>
        ) : (
          activity.map((entry) => (
            <div key={entry.id} className="flex gap-3 border-b border-mv-border-soft pb-3 last:border-0 last:pb-0">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mv-green" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-mv-ink">{entry.description}</p>
                <p className="mt-0.5 text-[11.5px] text-mv-ink-faint">
                  {formatRelativeTime(entry.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
