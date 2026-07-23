"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { roleLabels } from "@/lib/app-context";
import { createWorkspaceInviteLinkAction } from "@/app/[locale]/(app)/workspace/actions";
import posthog from "posthog-js";
import type { Restaurant, Role } from "@/lib/types";
import { Check, Copy } from "lucide-react";

const invitableRoles: Role[] = ["manager", "staff", "consultant"];

export function InviteWorkspaceMemberModal({
  open,
  onClose,
  workspaceId,
  restaurants,
  currentRestaurantId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  restaurants: Restaurant[];
  currentRestaurantId?: string;
  onSuccess?: () => void;
}) {
  const [role, setRole] = useState<Role>("staff");
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>(restaurants.map((r) => r.id));
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleRestaurant(id: string, checked: boolean) {
    setSelectedRestaurantIds((prev) => (checked ? [...prev, id] : prev.filter((r) => r !== id)));
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const trimmedEmail = email.trim();
      const invite = await createWorkspaceInviteLinkAction(
        workspaceId,
        role,
        selectedRestaurantIds,
        trimmedEmail || undefined
      );
      if (!invite) {
        setError("Impossible de générer le lien. Réessayez.");
        return;
      }
      posthog.capture("workspace_member_invited", {
        invited_role: role,
        restaurant_count: invite.restaurantIds.length,
        via_email: Boolean(trimmedEmail),
      });
      setEmailSent(Boolean(trimmedEmail));
      setLink(`${window.location.origin}/invite/w/${invite.token}`);
    });
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setLink(null);
    setEmailSent(false);
    setError(null);
    setRole("staff");
    setEmail("");
    setSelectedRestaurantIds(restaurants.map((r) => r.id));
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Inviter dans le workspace"
      description="Générez un lien à partager — valide 7 jours, le rôle et les établissements sont déjà attribués."
    >
      <div className="space-y-4">
        <Field label="Rôle">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={Boolean(link)}>
            {invitableRoles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Courriel" hint="Optionnel — envoie l'invitation automatiquement">
          <Input
            type="email"
            placeholder="collegue@exemple.com"
            value={email}
            disabled={Boolean(link)}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Établissements accessibles">
          <div className="space-y-1.5 rounded-lg border border-mv-border p-3">
            {restaurants.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">Aucun établissement dans ce workspace.</p>
            ) : (
              restaurants.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
                  <input
                    type="checkbox"
                    checked={selectedRestaurantIds.includes(r.id)}
                    disabled={Boolean(link)}
                    onChange={(e) => toggleRestaurant(r.id, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-mv-border"
                  />
                  {r.name}
                </label>
              ))
            )}
          </div>
        </Field>

        {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

        {link && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2">
              <p className="flex-1 truncate text-[12.5px] text-mv-ink-soft">{link}</p>
              <button
                onClick={handleCopy}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
                aria-label="Copier le lien"
              >
                {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[11.5px] text-mv-ink-faint">
              {emailSent
                ? "Courriel envoyé. Vous pouvez aussi partager le lien directement (SMS, WhatsApp, etc.)."
                : "Valide 7 jours. Partagez-le par le canal de votre choix (SMS, WhatsApp, etc.)."}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Fermer
          </Button>
          {!link && (
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Génération…" : "Générer le lien"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
