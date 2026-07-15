"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/minerva/FormField";
import { deleteMyAccountAction } from "@/app/(app)/profil/actions";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const CONFIRM_WORD = "SUPPRIMER";

export function DeleteAccountCard() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== CONFIRM_WORD) return;
    setIsDeleting(true);
    try {
      const result = await deleteMyAccountAction();
      if (result.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
      } else {
        toast.error(result.error);
        setIsDeleting(false);
      }
    } catch {
      toast.error("La suppression a échoué. Réessayez.");
      setIsDeleting(false);
    }
  }

  return (
    <Card className="border-mv-red-bg">
      <CardHeader
        eyebrow="Zone sensible"
        title="Supprimer mon compte"
        description="Efface définitivement votre compte et vos accès. Cette action est irréversible."
      />
      <div className="space-y-3">
        <p className="text-[12px] text-mv-ink-faint">
          Tapez <span className="font-mono font-semibold text-mv-ink">{CONFIRM_WORD}</span> pour confirmer.
        </p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
        />
        <Button
          variant="destructive"
          className="w-full"
          disabled={confirmText !== CONFIRM_WORD || isDeleting}
          onClick={handleDelete}
        >
          <AlertTriangle size={14} /> {isDeleting ? "Suppression…" : "Supprimer définitivement mon compte"}
        </Button>
      </div>
    </Card>
  );
}
