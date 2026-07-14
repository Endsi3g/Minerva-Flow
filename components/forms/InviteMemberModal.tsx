"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { roleLabels } from "@/lib/app-context";
import type { Role, TeamMember } from "@/lib/types";

const invitableRoles: Role[] = ["manager", "staff", "consultant"];

export function InviteMemberModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited?: (member: TeamMember) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const role = String(form.get("role") ?? "staff") as Role;

    if (!email) {
      setError("L'adresse courriel est requise.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/collaborateurs/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Impossible d'inviter cette personne.");
          return;
        }

        onInvited?.(data.member as TeamMember);
        onClose();
      } catch {
        setError("Une erreur réseau est survenue. Réessayez.");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inviter un collaborateur"
      description="Une invitation sera envoyée par courriel pour rejoindre l'établissement."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Adresse courriel">
          <Input type="email" name="email" placeholder="prenom@exemple.com" required />
        </Field>

        <Field label="Rôle">
          <Select name="role" defaultValue="staff">
            {invitableRoles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </Select>
        </Field>

        {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Envoi…" : "Envoyer l'invitation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
