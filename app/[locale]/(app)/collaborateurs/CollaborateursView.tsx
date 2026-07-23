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
import { InviteWorkspaceMemberModal } from "@/components/forms/InviteWorkspaceMemberModal";
import { MemberDetailModal } from "./MemberDetailModal";
import { TeamChatView } from "@/components/collaborateurs/TeamChatView";
import { getInitialTeamMessages } from "@/lib/data/team-chat";
import { updateMemberRoleAction, removeMemberAction } from "./actions";
import { listWorkspaceInvitesAction } from "../workspace/actions";
import { useApp, roleLabels } from "@/lib/app-context";
import { useTeamPresence } from "@/hooks/use-team-presence";
import { formatRelativeTime, cn } from "@/lib/utils";
import posthog from "posthog-js";
import type { WorkspaceInviteListEntry } from "@/lib/data/workspace-invites";
import type { Restaurant, Role, TeamMember } from "@/lib/types";
import { Plus, Users, Trash2, ChevronRight, Mail, MessageSquare, Bot } from "lucide-react";
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
  workspaceId,
  restaurants,
}: {
  restaurantId: string | null;
  members: TeamMember[];
  workspaceId: string | null;
  restaurants: Restaurant[];
}) {
  const { role, authUser } = useApp();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const onlineIds = useTeamPresence(restaurantId, authUser);

  const [activeTab, setActiveTab] = useState<"members" | "chat">("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<WorkspaceInviteListEntry[]>([]);

  const canManage = Boolean(restaurantId) && Boolean(workspaceId) && (role === "owner" || role === "manager");

  const initialChatMessages = restaurantId ? getInitialTeamMessages(restaurantId, "general") : [];

  function refreshInvites() {
    if (!restaurantId || !workspaceId || !canManage) return;
    listWorkspaceInvitesAction(workspaceId).then((all) =>
      setInvites(all.filter((invite) => invite.restaurantIds.includes(restaurantId)))
    );
  }

  useEffect(refreshInvites, [restaurantId, workspaceId, canManage]);

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collaborateurs &amp; Équipe"
        title="Collaborateurs &amp; Communication"
        description="Gérez les membres de l'équipe, leurs rôles et communiquez en direct avec l'assistant @FlowAI."
        action={
          canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus size={15} /> Inviter un collaborateur
            </Button>
          )
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-mv-border bg-mv-surface rounded-xl p-1 w-fit shadow-mv-sm gap-1">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-display text-[13.5px] font-bold transition-all",
            activeTab === "members"
              ? "bg-mv-green text-mv-surface shadow-mv-sm"
              : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
          )}
        >
          <Users size={16} />
          <span>Membres &amp; Rôles ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-display text-[13.5px] font-bold transition-all",
            activeTab === "chat"
              ? "bg-mv-green text-mv-surface shadow-mv-sm"
              : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
          )}
        >
          <MessageSquare size={16} />
          <span>Chat d&apos;Équipe &amp; @FlowAI</span>
          <span className="flex h-2 w-2 rounded-full bg-mv-green-tint animate-pulse" />
        </button>
      </div>

      {/* Tab 1: Team Members List */}
      {activeTab === "members" && (
        <>
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
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {members.map((m) => {
                  const isOnline = Array.isArray(onlineIds) ? onlineIds.includes(m.id) : (onlineIds as any)?.has?.(m.id) ?? false;
                  const isSelf = authUser?.id === m.id;
                  return (
                    <Tr key={m.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} size={36} />
                          <div>
                            <button
                              onClick={() => setSelected(m)}
                              className="font-bold text-mv-ink hover:text-mv-green-dark transition-colors flex items-center gap-1.5"
                            >
                              <span>{m.name}</span>
                              {isSelf && (
                                <span className="text-[11px] font-semibold text-mv-ink-faint bg-mv-cream px-1.5 py-0.5 rounded border border-mv-border-soft">
                                  Vous
                                </span>
                              )}
                            </button>
                            <p className="text-[12px] text-mv-ink-soft">{m.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={roleTone[m.role]}>{roleLabels[m.role] ?? m.role}</Badge>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${isOnline ? "text-mv-green-dark" : "text-mv-ink-faint"}`}>
                          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-mv-green animate-pulse" : "bg-mv-border"}`} />
                          {isOnline ? "En ligne" : "Hors ligne"}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="xs" variant="secondary" onClick={() => setSelected(m)}>
                            Détails <ChevronRight size={13} />
                          </Button>
                          {canManage && !isSelf && (
                            <Button size="xs" variant="secondary" onClick={() => handleRemove(m)} disabled={pendingId === m.id}>
                              <Trash2 size={13} className="text-mv-red" />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </>
      )}

      {/* Tab 2: Team Chat & @FlowAI */}
      {activeTab === "chat" && restaurantId && (
        <TeamChatView
          restaurantId={restaurantId}
          initialMessages={initialChatMessages}
          teamMembers={members}
        />
      )}

      {inviteOpen && workspaceId && restaurantId && (
        <InviteWorkspaceMemberModal
          workspaceId={workspaceId}
          currentRestaurantId={restaurantId}
          restaurants={restaurants}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onSuccess={refreshInvites}
        />
      )}

      {selected && (
        <MemberDetailModal
          member={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
