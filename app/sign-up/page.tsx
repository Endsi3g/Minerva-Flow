"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeatPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/overview` },
      });
      if (error) throw error;
      router.push("/sign-up-success");
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
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <h1 className="font-display text-[20px] font-medium text-mv-ink">Créer un compte</h1>
        <p className="mt-1 text-[13px] text-mv-ink-soft">
          Démarrez votre cockpit de revenus Minerva.
        </p>

        <form onSubmit={handleSignUp} className="mt-5 flex flex-col gap-4">
          <Field label="Email">
            <Input
              type="email"
              placeholder="vous@restaurant.fr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mot de passe">
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirmer le mot de passe">
            <Input
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </Field>

          {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Création…" : "Créer le compte"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[12.5px] text-mv-ink-faint">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-mv-green-dark hover:underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}
