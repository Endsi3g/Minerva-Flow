"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { Select } from "@/components/minerva/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteMemberModal } from "@/components/forms/InviteMemberModal";
import { MemberDetailModal } from "./MemberDetailModal";
import { updateMemberRoleAction, removeMemberAction, listInvitesAction } from "./actions";
import { useApp, roleLabels } from "@/lib/app-context";
import { useTeamPresence } from "@/hooks/use-team-presence";
import { formatRelativeTime } from "@/lib/utils";
import posthog from "posthog-js";
import type { InviteListEntry } from "@/lib/data/invites";
import type { Role, TeamMember } from "@/lib/types";
import { Plus, Users, Trash2, ChevronRight, Mail } from "lucide-react";
import Link from "next/link";

const roleTone: Record<Role, "green" | "lime" | "amber"> = {
  owner: "green",
  manager: "green",
  staff: "lime",
  consultant: "amber",
};

export function CollaborateursView({
  restaurantId,
  members,
}: {
  restaurantId: string | null;
  members: TeamMember[];
}) {
  const { role, authUser } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const onlineIds = useTeamPresence(restaurantId, authUser);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteListEntry[]>([]);

  const canManage = Boolean(restaurantId) && (role === "owner" || role === "manager");

  function refreshInvites() {
    if (!restaurantId || !canManage) return;
    listInvitesAction(restaurantId).then(setInvites);
  }

  useEffect(refreshInvites, [restaurantId, canManage]);

  function handleRoleChange(member: TeamMember, next: Role) {
    if (!restaurantId || !member.membershipId) return;
    setPendingId(member.id);
    startTransition(async () => {
      await updateMemberRoleAction(restaurantId, member.membershipId!, next);
      posthog.capture("member_role_changed", { previous_role: member.role, new_role: next });
      setPendingId(null);
      router.refresh();
    });
  }

  function handleRemove(member: TeamMember) {
    if (!restaurantId || !member.membershipId) return;
    if (!window.confirm(`Retirer ${member.name} des collaborateurs ?`)) return;
    setPendingId(member.id);
    startTransition(async () => {
      await removeMemberAction(restaurantId, member.membershipId!);
      posthog.capture("member_removed", { removed_role: member.role });
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collaborateurs"
        title="Collaborateurs"
        description="Les personnes qui ont accès à cet établissement, leur rôle et leur statut."
        action={
          canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus size={15} /> Inviter un collaborateur
            </Button>
          )
        }
      />

      {!restaurantId || members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun collaborateur pour le moment"
          description="Invitez des collègues pour qu'ils accèdent à cet établissement."
          action={
            canManage && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Plus size={15} /> Inviter un collaborateur
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <THead>
            <Th>Collaborateur</Th>
            <Th>Rôle</Th>
            <Th>Statut</Th>
            {canManage && <Th className="text-right">Actions</Th>}
            <Th className="text-right"></Th>
          </THead>
          <tbody>
            {members.map((m) => (
              <Tr key={m.id} onClick={() => setSelected(m)}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <Avatar name={m.name} src={m.avatarUrl} size={30} />
                      {onlineIds.has(m.id) && (
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-mv-green ring-2 ring-mv-surface"
                          aria-label="En ligne"
                          title="En ligne"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-mv-ink">{m.name}</p>
                      <p className="truncate text-[11.5px] text-mv-ink-faint">{m.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  {canManage ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={m.role}
                        disabled={pendingId === m.id}
                        onChange={(e) => handleRoleChange(m, e.target.value as Role)}
                        className="h-8 w-40 text-[12.5px]"
                      >
                        {(Object.keys(roleLabels) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <Badge tone={roleTone[m.role]}>{roleLabels[m.role]}</Badge>
                  )}
                </Td>
                <Td>
                  <Badge tone={m.status === "actif" ? "green" : "amber"} dot>
                    {m.status === "actif" ? "Actif" : "Invitation envoyée"}
                  </Badge>
                </Td>
                {canManage && (
                  <Td className="text-right">
                    {m.id !== authUser?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(m);
                        }}
                        disabled={pendingId === m.id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-mv-ink-faint transition-colors hover:bg-mv-red-bg hover:text-mv-red disabled:opacity-50"
                        aria-label={`Retirer ${m.name} des collaborateurs`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </Td>
                )}
                <Td className="text-right">
                  <Link
                    href={`/collaborateurs/${m.id}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Voir la fiche complète"
                    className="inline-flex rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                  >
                    <ChevronRight size={15} />
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {canManage && invites.length > 0 && (
        <div className="mt-6 rounded-2xl border border-mv-border bg-mv-surface p-5">
          <p className="mb-3 text-[13px] font-semibold text-mv-ink">Invitations envoyées</p>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-mv-ink-faint" />
                  <div>
                    <p className="text-[12.5px] font-medium text-mv-ink">
                      {roleLabels[invite.role]} · {formatRelativeTime(invite.createdAt)}
                    </p>
                    {invite.redeemedByEmail && (
                      <p className="text-[11.5px] text-mv-ink-faint">Rejoint par {invite.redeemedByEmail}</p>
                    )}
                  </div>
                </div>
                <Badge tone={invite.status === "utilisee" ? "green" : invite.status === "expiree" ? "neutral" : "amber"} dot>
                  {invite.status === "utilisee" ? "A rejoint" : invite.status === "expiree" ? "Expirée" : "En attente"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {restaurantId && (
        <InviteMemberModal
          restaurantId={restaurantId}
          open={inviteOpen}
          onClose={() => {
            setInviteOpen(false);
            refreshInvites();
          }}
        />
      )}

      {restaurantId && (
        <MemberDetailModal
          restaurantId={restaurantId}
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
