"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/minerva/FormField";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { InviteWorkspaceMemberModal } from "@/components/forms/InviteWorkspaceMemberModal";
import { useApp, roleLabels } from "@/lib/app-context";
import { formatRelativeTime } from "@/lib/utils";
import {
  createWorkspaceForCurrentRestaurantAction,
  renameWorkspaceAction,
  assignRestaurantToWorkspaceAction,
  listWorkspaceInvitesAction,
  type WorkspaceHubData,
} from "./actions";
import type { WorkspaceInviteListEntry } from "@/lib/data/workspace-invites";
import { Plus, Mail, CreditCard, Building2 } from "lucide-react";

function NoWorkspaceYet() {
  const router = useRouter();
  const { role } = useApp();
  const canCreate = role === "owner" || role === "manager";
  const [name, setName] = useState("Mon workspace");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await createWorkspaceForCurrentRestaurantAction(name);
    setSaving(false);
    if (ok) router.refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Gérer le workspace"
        description="Invitez votre équipe, assignez des établissements et gérez les rôles."
      />
      <Card className="max-w-lg">
        <CardHeader
          eyebrow="Configuration"
          title="Créer votre workspace"
          description="Cet établissement n'appartient à aucun workspace pour l'instant."
        />
        {canCreate ? (
          <div className="space-y-4">
            <Field label="Nom du workspace">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Groupe Vieux-Port" />
            </Field>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving ? "Création…" : "Créer le workspace"}
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-mv-ink-soft">
            Seul un propriétaire ou un gérant peut créer le workspace de cet établissement.
          </p>
        )}
      </Card>
    </div>
  );
}

export function WorkspaceView({ data }: { data: WorkspaceHubData | null }) {
  const router = useRouter();
  const { restaurants: myRestaurants } = useApp();
  const [, startTransition] = useTransition();
  const [nameDraft, setNameDraft] = useState(data?.workspace.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState<WorkspaceInviteListEntry[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => setNameDraft(data?.workspace.name ?? ""), [data?.workspace.name]);

  useEffect(() => {
    if (!data?.canManage) return;
    listWorkspaceInvitesAction(data.workspace.id).then(setInvites);
  }, [data?.workspace.id, data?.canManage]);

  if (!data) return <NoWorkspaceYet />;

  const { workspace, members, restaurants, canManage } = data;
  const unassigned = myRestaurants.filter((r) => !r.workspaceId);

  async function handleSaveName() {
    if (!nameDraft.trim() || nameDraft === workspace.name) return;
    setSavingName(true);
    const ok = await renameWorkspaceAction(workspace.id, nameDraft);
    setSavingName(false);
    if (ok) router.refresh();
  }

  function handleAssign(restaurantId: string) {
    setAssigningId(restaurantId);
    startTransition(async () => {
      await assignRestaurantToWorkspaceAction(restaurantId, workspace.id);
      setAssigningId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title={workspace.name}
        description="Invitez votre équipe, assignez des établissements et gérez les rôles."
        action={
          canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus size={15} /> Inviter dans le workspace
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {canManage && (
          <Card>
            <CardHeader eyebrow="Identité" title="Nom du workspace" />
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
              </div>
              <Button
                onClick={handleSaveName}
                disabled={!nameDraft.trim() || nameDraft === workspace.name || savingName}
              >
                {savingName ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            eyebrow="Établissements"
            title="Établissements du workspace"
            description="Les restaurants couverts par la facturation et les invitations de ce workspace."
          />
          <div className="space-y-1.5">
            {restaurants.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-[13px] text-mv-ink-soft">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                {r.name}
              </div>
            ))}
          </div>

          {canManage && unassigned.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-mv-border-soft pt-4">
              <p className="text-[12.5px] font-medium text-mv-ink-soft">
                Établissements que vous possédez, hors de ce workspace
              </p>
              {unassigned.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] text-mv-ink-soft">
                    <Building2 size={14} className="text-mv-ink-faint" /> {r.name}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={assigningId === r.id}
                    onClick={() => handleAssign(r.id)}
                  >
                    Ajouter au workspace
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Équipe" title="Membres du workspace" />
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 border-b border-mv-border-soft pb-3 last:border-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={m.name} src={m.avatarUrl} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-mv-ink">{m.name}</p>
                    <p className="truncate text-[11.5px] text-mv-ink-faint">
                      {m.restaurantNames.length > 0 ? m.restaurantNames.join(", ") : "Aucun établissement assigné"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={m.status === "actif" ? "green" : "amber"} dot>
                    {m.status === "actif" ? "Actif" : "Invitation envoyée"}
                  </Badge>
                  <Badge tone={m.role === "owner" || m.role === "manager" ? "green" : "lime"}>
                    {roleLabels[m.role]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {canManage && invites.length > 0 && (
          <Card>
            <CardHeader eyebrow="Invitations" title="Invitations envoyées" />
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
          </Card>
        )}

        {canManage && (
          <Card>
            <CardHeader eyebrow="Facturation" title="Abonnement" description="Un seul abonnement pour tous les établissements de ce workspace." />
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-mv-green-dark hover:underline"
            >
              <CreditCard size={15} /> Gérer la facturation
            </Link>
          </Card>
        )}
      </div>

      <InviteWorkspaceMemberModal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          listWorkspaceInvitesAction(workspace.id).then(setInvites);
        }}
        workspaceId={workspace.id}
        restaurants={restaurants}
      />
    </div>
  );
}
