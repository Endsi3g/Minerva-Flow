"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Select } from "@/components/minerva/FormField";
import { formatRelativeTime } from "@/lib/utils";
import {
  getMemberActivityAction,
  updateMemberRoleAction,
  updateMemberSidebarPermissionsAction,
  removeMemberAction,
} from "../actions";
import { useActivityLogRealtime, type ActivityLogRow } from "@/hooks/use-activity-log-realtime";
import { useApp, roleLabels } from "@/lib/app-context";
import { sidebarNavCatalog } from "@/components/shell/AppSidebar";
import type { ActivityLogEntry, Role, TeamMember } from "@/lib/types";
import { ArrowLeft, History, Trash2 } from "lucide-react";

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

export function MemberDetailPage({
  restaurantId,
  member,
}: {
  restaurantId: string;
  member: TeamMember;
}) {
  const { role: myRole, authUser } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [accessPending, setAccessPending] = useState(false);
  const [sidebarPermissions, setSidebarPermissions] = useState<string[] | null>(member.sidebarPermissions);

  const canManage = myRole === "owner" || myRole === "manager";

  function toggleNavKey(key: string, checked: boolean) {
    if (!member.membershipId) return;
    const previous = sidebarPermissions;
    const current = previous ?? sidebarNavCatalog.map((n) => n.key);
    const next = checked ? Array.from(new Set([...current, key])) : current.filter((k) => k !== key);
    setSidebarPermissions(next);
    setAccessPending(true);
    startTransition(async () => {
      const ok = await updateMemberSidebarPermissionsAction(restaurantId, member.membershipId!, next);
      if (!ok) setSidebarPermissions(previous);
      setAccessPending(false);
      router.refresh();
    });
  }

  function resetAccess() {
    if (!member.membershipId) return;
    const previous = sidebarPermissions;
    setSidebarPermissions(null);
    setAccessPending(true);
    startTransition(async () => {
      const ok = await updateMemberSidebarPermissionsAction(restaurantId, member.membershipId!, null);
      if (!ok) setSidebarPermissions(previous);
      setAccessPending(false);
      router.refresh();
    });
  }

  useEffect(() => {
    getMemberActivityAction(restaurantId, member.id).then((entries) => {
      setActivity(entries);
      setLoading(false);
    });
  }, [restaurantId, member.id]);

  useActivityLogRealtime("restaurant_id", restaurantId, (row) => {
    if (row.actor_id !== member.id) return;
    setActivity((prev) => (prev.some((e) => e.id === row.id) ? prev : [toActivityLogEntry(row, member.name), ...prev]));
  });

  function handleRoleChange(next: Role) {
    if (!member.membershipId) return;
    setPending(true);
    startTransition(async () => {
      await updateMemberRoleAction(restaurantId, member.membershipId!, next);
      setPending(false);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!member.membershipId) return;
    if (!window.confirm(`Retirer ${member.name} des collaborateurs ?`)) return;
    setPending(true);
    startTransition(async () => {
      await removeMemberAction(restaurantId, member.membershipId!);
      router.push("/collaborateurs");
    });
  }

  return (
    <div>
      <Link
        href="/collaborateurs"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> Retour aux collaborateurs
      </Link>
      <PageHeader eyebrow="Collaborateurs" title={member.name} description={member.email} />

      <div className="max-w-xl space-y-4">
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-5">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} src={member.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[16px] font-medium text-mv-ink">{member.name}</p>
              <p className="truncate text-[12.5px] text-mv-ink-faint">{member.email}</p>
            </div>
            <Badge tone={member.status === "actif" ? "green" : "amber"} dot>
              {member.status === "actif" ? "Actif" : "Invitation envoyée"}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-mv-border-soft pt-4">
            <span className="text-[12.5px] font-medium text-mv-ink-soft">Rôle</span>
            {canManage ? (
              <Select
                value={member.role}
                disabled={pending}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="h-8 w-40 text-[12.5px]"
              >
                {(Object.keys(roleLabels) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </Select>
            ) : (
              <Badge tone={member.role === "owner" || member.role === "manager" ? "green" : "lime"}>
                {roleLabels[member.role]}
              </Badge>
            )}
          </div>

          {canManage && member.id !== authUser?.id && (
            <button
              onClick={handleRemove}
              disabled={pending}
              className="mt-4 flex items-center gap-1.5 text-[12.5px] font-medium text-mv-red hover:underline disabled:opacity-50"
            >
              <Trash2 size={13} /> Retirer des collaborateurs
            </button>
          )}
        </div>

        {canManage && (
          <div className="rounded-2xl border border-mv-border bg-mv-surface p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-mv-ink">Accès au menu</p>
              {sidebarPermissions !== null && (
                <button
                  onClick={resetAccess}
                  disabled={accessPending}
                  className="text-[12px] font-medium text-mv-ink-soft hover:underline disabled:opacity-50"
                >
                  Réinitialiser (accès complet)
                </button>
              )}
            </div>
            <p className="mb-3 text-[12px] text-mv-ink-faint">
              Par défaut, ce collaborateur voit tout ce que son rôle autorise. Décochez une section pour
              la lui masquer — cela ne peut que restreindre son accès, jamais l&apos;élargir.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {sidebarNavCatalog.map((item) => {
                const checked = sidebarPermissions === null || sidebarPermissions.includes(item.key);
                return (
                  <label key={item.key} className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={accessPending}
                      onChange={(e) => toggleNavKey(item.key, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-mv-border"
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-mv-border bg-mv-surface p-5">
          <p className="mb-3 text-[13px] font-semibold text-mv-ink">Activité récente</p>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {loading ? (
              <p className="text-[12.5px] text-mv-ink-faint">Chargement…</p>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <History size={20} className="text-mv-ink-faint" />
                <p className="text-[12.5px] text-mv-ink-faint">Aucune activité enregistrée pour ce collaborateur.</p>
              </div>
            ) : (
              activity.map((entry) => (
                <div key={entry.id} className="flex gap-3 border-b border-mv-border-soft pb-3 last:border-0 last:pb-0">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mv-green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-mv-ink">{entry.description}</p>
                    <p className="mt-0.5 text-[11.5px] text-mv-ink-faint">{formatRelativeTime(entry.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
