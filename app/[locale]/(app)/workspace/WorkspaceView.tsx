"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { InviteWorkspaceMemberModal } from "@/components/forms/InviteWorkspaceMemberModal";
import { useApp, roleLabels } from "@/lib/app-context";
import { formatRelativeTime } from "@/lib/utils";
import {
  createWorkspaceForCurrentRestaurantAction,
  renameWorkspaceAction,
  assignRestaurantToWorkspaceAction,
  listWorkspaceInvitesAction,
  updateWorkspaceBrandingAction,
  verifyWorkspaceBrandDomainAction,
  type WorkspaceHubData,
} from "./actions";
import type { WorkspaceInviteListEntry } from "@/lib/data/workspace-invites";
import {
  BRAND_AI_TONES,
  BRAND_BODY_FONTS,
  BRAND_HEADING_FONTS,
  BRAND_LOCALES,
  type WorkspaceBranding,
  type WorkspaceBrandingInput,
} from "@/lib/branding/workspace-branding";
import type { WorkspaceDomainVerification } from "@/lib/data/workspace-branding";
import { Plus, Mail, CreditCard, Building2, Palette, Globe2, Bot } from "lucide-react";

function brandingInput(branding: WorkspaceBranding): WorkspaceBrandingInput {
  return {
    brandName: branding.brandName,
    logoUrl: branding.logoUrl ?? "",
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    headingFont: branding.headingFont,
    bodyFont: branding.bodyFont,
    preferredLocale: branding.preferredLocale,
    aiTone: branding.aiTone,
    requestedCustomDomain: branding.requestedCustomDomain ?? "",
    emailSenderName: branding.emailSenderName ?? "",
    emailReplyTo: branding.emailReplyTo ?? "",
  };
}

const fontLabels = {
  new_york: "New York",
  playfair_display: "Playfair Display",
  system_serif: "Sérif système",
  plus_jakarta_sans: "Plus Jakarta Sans",
  inter: "Inter",
  system_sans: "Sans sérif système",
} as const;

const localeLabels = { "fr-CA": "Français (Canada)", "fr-FR": "Français (France)", "en-CA": "English (Canada)", "en-US": "English (US)" } as const;
const toneLabels = { professionnel: "Professionnel", chaleureux: "Chaleureux", direct: "Direct", luxe: "Luxe éditorial" } as const;

function BrandSettingsCard({
  branding,
  domainVerification,
}: {
  branding: WorkspaceBranding;
  domainVerification: WorkspaceDomainVerification | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkspaceBrandingInput>(() => brandingInput(branding));
  const [saving, setSaving] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function update<K extends keyof WorkspaceBrandingInput>(key: K, value: WorkspaceBrandingInput[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    const ok = await updateWorkspaceBrandingAction(branding.workspaceId, draft);
    setSaving(false);
    setNotice(ok ? "Identité enregistrée. La prévisualisation a été actualisée." : "Impossible d’enregistrer. Vérifiez les champs, notamment le domaine et l’adresse courriel.");
    if (ok) router.refresh();
  }

  async function verifyDomain() {
    setVerifyingDomain(true);
    const verified = await verifyWorkspaceBrandDomainAction(branding.workspaceId);
    setVerifyingDomain(false);
    setNotice(verified ? "Domaine vérifié. Il peut maintenant recevoir l’identité de votre marque." : "Le TXT n’a pas encore été trouvé. Vérifiez la valeur puis réessayez après la propagation DNS.");
    router.refresh();
  }

  const domainStatus = {
    non_configure: "Aucun domaine demandé",
    en_attente: "Vérification DNS à venir",
    verifie: "Domaine vérifié",
    erreur: "Vérification à corriger",
  }[branding.customDomainStatus];

  return (
    <Card>
      <CardHeader
        eyebrow="Marque blanche"
        title="Identité de votre marque"
        description="Cette identité s’applique à tous les établissements du workspace. Une mention « Propulsé par Minerva Flow » demeure présente de façon discrète."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom affiché" required>
          <Input value={draft.brandName} onChange={(event) => update("brandName", event.target.value)} maxLength={100} />
        </Field>
        <Field label="URL du logo" hint="Une URL HTTPS publique. Le téléversement dédié arrive à la phase suivante.">
          <Input value={draft.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} type="url" placeholder="https://…/logo.svg" />
        </Field>
        <Field label="Couleur principale">
          <div className="flex items-center gap-2"><Input className="h-10 w-12 p-1" type="color" value={draft.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /><Input value={draft.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" /></div>
        </Field>
        <Field label="Couleur secondaire">
          <div className="flex items-center gap-2"><Input className="h-10 w-12 p-1" type="color" value={draft.secondaryColor} onChange={(event) => update("secondaryColor", event.target.value)} /><Input value={draft.secondaryColor} onChange={(event) => update("secondaryColor", event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" /></div>
        </Field>
        <Field label="Couleur d’accent">
          <div className="flex items-center gap-2"><Input className="h-10 w-12 p-1" type="color" value={draft.accentColor} onChange={(event) => update("accentColor", event.target.value)} /><Input value={draft.accentColor} onChange={(event) => update("accentColor", event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" /></div>
        </Field>
        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-mv-ink-soft"><Palette size={14} /> Aperçu</div>
          <p className="mt-2 font-display text-lg" style={{ color: draft.secondaryColor }}>{draft.brandName || "Votre marque"}</p>
          <span className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: draft.primaryColor, color: "#fff" }}>Action principale</span>
        </div>
        <Field label="Police des titres"><Select value={draft.headingFont} onChange={(event) => update("headingFont", event.target.value as WorkspaceBrandingInput["headingFont"])}>{BRAND_HEADING_FONTS.map((font) => <option key={font} value={font}>{fontLabels[font]}</option>)}</Select></Field>
        <Field label="Police de l’interface"><Select value={draft.bodyFont} onChange={(event) => update("bodyFont", event.target.value as WorkspaceBrandingInput["bodyFont"])}>{BRAND_BODY_FONTS.map((font) => <option key={font} value={font}>{fontLabels[font]}</option>)}</Select></Field>
      </div>

      <div className="mt-5 grid gap-4 border-t border-mv-border-soft pt-5 md:grid-cols-2">
        <Field label="Domaine personnalisé" hint={domainStatus}>
          <div className="relative"><Globe2 size={15} className="pointer-events-none absolute left-3 top-3 text-mv-ink-faint" /><Input className="pl-9" value={draft.requestedCustomDomain} onChange={(event) => update("requestedCustomDomain", event.target.value)} placeholder="app.votremarque.com" /></div>
        </Field>
        <Field label="Nom de l’expéditeur"><Input value={draft.emailSenderName} onChange={(event) => update("emailSenderName", event.target.value)} placeholder={draft.brandName || "Votre marque"} /></Field>
        <Field label="Courriel de réponse"><Input type="email" value={draft.emailReplyTo} onChange={(event) => update("emailReplyTo", event.target.value)} placeholder="bonjour@votremarque.com" /></Field>
        <Field label="Langue principale"><Select value={draft.preferredLocale} onChange={(event) => update("preferredLocale", event.target.value as WorkspaceBrandingInput["preferredLocale"])}>{BRAND_LOCALES.map((locale) => <option key={locale} value={locale}>{localeLabels[locale]}</option>)}</Select></Field>
        <Field label="Ton de l’assistant IA"><div className="relative"><Bot size={15} className="pointer-events-none absolute left-3 top-3 text-mv-ink-faint" /><Select className="pl-9" value={draft.aiTone} onChange={(event) => update("aiTone", event.target.value as WorkspaceBrandingInput["aiTone"])}>{BRAND_AI_TONES.map((tone) => <option key={tone} value={tone}>{toneLabels[tone]}</option>)}</Select></div></Field>
      </div>

      {domainVerification?.domain && domainVerification.status !== "verifie" && (
        <div className="mt-5 rounded-xl border border-mv-border bg-mv-cream-soft p-4">
          <p className="text-[13px] font-semibold text-mv-ink">Vérifier {domainVerification.domain}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-soft">Ajoutez cet enregistrement TXT à ce sous-domaine chez votre fournisseur DNS, puis lancez la vérification. L’activation de l’hébergement du domaine reste contrôlée côté plateforme.</p>
          <code className="mt-3 block overflow-x-auto rounded-lg bg-mv-ink px-3 py-2 text-[11px] text-mv-cream-soft">minerva-flow-verification={domainVerification.token}</code>
          <Button className="mt-3" size="sm" variant="secondary" onClick={verifyDomain} disabled={verifyingDomain} loading={verifyingDomain}>Vérifier le TXT</Button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-mv-border-soft pt-4">
        <p className="text-[12px] text-mv-ink-faint">Les modules, intégrations vérifiées et l’envoi depuis votre domaine seront activés dans les prochaines phases.</p>
        <Button onClick={save} disabled={saving} loading={saving}>Enregistrer l’identité</Button>
      </div>
      {notice && <p className="mt-3 text-[12.5px] text-mv-ink-soft" role="status">{notice}</p>}
    </Card>
  );
}

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

  useEffect(() => {
    if (!data?.canManage) return;
    listWorkspaceInvitesAction(data.workspace.id).then(setInvites);
  }, [data?.workspace.id, data?.canManage]);

  if (!data) return <NoWorkspaceYet />;

  const { workspace, members, restaurants, canManage, branding, canManageBrand, domainVerification } = data;
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

        {canManageBrand && branding && <BrandSettingsCard key={branding.updatedAt} branding={branding} domainVerification={domainVerification} />}

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
