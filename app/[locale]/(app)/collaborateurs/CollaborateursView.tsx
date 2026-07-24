"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteWorkspaceMemberModal } from "@/components/forms/InviteWorkspaceMemberModal";
import { MemberDetailModal } from "./MemberDetailModal";
import { TeamChatView } from "@/components/collaborateurs/TeamChatView";
import { getTeamMessages } from "@/lib/data/team-chat";
import { updateMemberRoleAction, removeMemberAction } from "./actions";
import { listWorkspaceInvitesAction } from "../workspace/actions";
import { useApp, roleLabels } from "@/lib/app-context";
import { formatRelativeTime, cn } from "@/lib/utils";
import posthog from "posthog-js";
import type { WorkspaceInviteListEntry } from "@/lib/data/workspace-invites";
import type { Restaurant, Role, TeamMember } from "@/lib/types";
import {
  Plus,
  Users,
  MessageSquare,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";

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

  const [view, setView] = useState<"chat" | "members">("chat");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<WorkspaceInviteListEntry[]>([]);

  const canManage =
    Boolean(restaurantId) &&
    Boolean(workspaceId) &&
    (role === "owner" || role === "manager");

  const [initialChatMessages, setInitialChatMessages] = useState<any[]>([]);

  useEffect(() => {
    if (restaurantId) {
      getTeamMessages(restaurantId, "general").then(setInitialChatMessages);
    }
  }, [restaurantId]);

  function refreshInvites() {
    if (!restaurantId || !workspaceId || !canManage) return;
    listWorkspaceInvitesAction(workspaceId).then((all) =>
      setInvites(all.filter((inv) => inv.restaurantIds.includes(restaurantId)))
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Collaborateurs &amp; Équipe"
        title="Chat d'Équipe"
        description="Discutez en direct avec vos collaborateurs et mentionnez @FlowAI pour obtenir de l'aide métier instantanée."
        action={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setView("chat")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
                  view === "chat"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <MessageSquare size={14} />
                Chat
                <span className="ml-0.5 flex h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
              </button>
              <button
                onClick={() => setView("members")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
                  view === "members"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                )}
              >
                <Users size={14} />
                Membres ({members.length})
              </button>
            </div>

            {canManage && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Plus size={15} /> Inviter
              </Button>
            )}
          </div>
        }
      />

      {/* ── Chat View (full-screen) ── */}
      {view === "chat" && restaurantId && (
        <TeamChatView
          restaurantId={restaurantId}
          initialMessages={initialChatMessages}
          teamMembers={members}
          onInvite={canManage ? () => setInviteOpen(true) : undefined}
        />
      )}

      {view === "chat" && !restaurantId && (
        <EmptyState
          icon={MessageSquare}
          title="Aucun établissement sélectionné"
          description="Veuillez sélectionner un établissement pour accéder au chat d'équipe."
        />
      )}

      {/* ── Members View ── */}
      {view === "members" && (
        <div className="rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm overflow-hidden">
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
            <div className="divide-y divide-mv-border-soft">
              {members.map((m) => {
                const isSelf = authUser?.id === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-mv-cream-soft/50 transition-colors"
                  >
                    <Avatar name={m.name} src={m.avatarUrl} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(m)}
                          className="font-semibold text-mv-ink hover:text-mv-green-dark transition-colors text-[14px]"
                        >
                          {m.name}
                        </button>
                        {isSelf && (
                          <span className="text-[10.5px] font-medium text-mv-ink-faint bg-mv-cream px-1.5 py-0.5 rounded border border-mv-border-soft">
                            Vous
                          </span>
                        )}
                        <Badge tone={roleTone[m.role]}>{roleLabels[m.role] ?? m.role}</Badge>
                      </div>
                      <p className="text-[12px] text-mv-ink-soft mt-0.5">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSelected(m)}
                      >
                        Activité <ChevronRight size={13} />
                      </Button>
                      {canManage && !isSelf && (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleRemove(m)}
                          disabled={pendingId === m.id}
                        >
                          <Trash2 size={13} className="text-mv-red" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
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
