"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { createClient } from "@/lib/supabase/client";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Flow <span className="text-mv-green-dark">par Minerva</span>
        </span>
      </div>

      <Card className="w-full max-w-sm">
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
              <MailCheck size={20} />
            </div>
            <h1 className="font-display text-[19px] font-medium text-mv-ink">Vérifiez vos emails</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">
              Si un compte existe pour {email}, vous recevrez un lien de réinitialisation.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[20px] font-medium text-mv-ink">
              Mot de passe oublié
            </h1>
            <p className="mt-1 text-[13px] text-mv-ink-soft">
              Entrez votre email, on vous envoie un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <Field label="Email">
                <Input
                  type="email"
                  placeholder="vous@restaurant.fr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Envoi…" : "Envoyer le lien"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-[12.5px] text-mv-ink-faint">
          <Link href="/login" className="font-semibold text-mv-green-dark hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </Card>
    </div>
  );
}
