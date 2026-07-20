"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/minerva/FormField";
import { roleLabels } from "@/lib/app-context";
import { createInviteLinkAction } from "@/app/[locale]/(app)/collaborateurs/actions";
import posthog from "posthog-js";
import type { Role } from "@/lib/types";
import { Check, Copy } from "lucide-react";

const invitableRoles: Role[] = ["manager", "staff", "consultant"];

export function InviteMemberModal({
  open,
  onClose,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const [role, setRole] = useState<Role>("staff");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const invite = await createInviteLinkAction(restaurantId, role);
      if (!invite) {
        setError("Impossible de générer le lien. Réessayez.");
        return;
      }
      posthog.capture("member_invited", { invited_role: role });
      setLink(`${window.location.origin}/invite/${invite.token}`);
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
    setError(null);
    setRole("staff");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Inviter un collaborateur"
      description="Générez un lien à partager — valide 7 jours, le rôle est déjà attribué. Si la personne a déjà un compte (par exemple pour un autre établissement), elle sera simplement ajoutée à celui-ci."
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
              Valide 7 jours. Partagez-le par le canal de votre choix (SMS, WhatsApp, etc.).
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
