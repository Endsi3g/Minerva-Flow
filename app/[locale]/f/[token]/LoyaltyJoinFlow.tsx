"use client";

import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { Gift, Mail, Heart } from "lucide-react";
import { joinLoyaltyProgramAction } from "./actions";
import type { PublicLoyaltyLanding } from "@/lib/data/loyalty-shares";

export function LoyaltyJoinFlow({ token, landing }: { token: string; landing: PublicLoyaltyLanding }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const result = await joinLoyaltyProgramAction(token, { name, email });
    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error ?? "Une erreur est survenue.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </div>
        <Card>
          {status === "sent" ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                <Mail size={18} />
              </div>
              <p className="font-display text-[17px] font-medium text-mv-ink">Vérifiez vos courriels</p>
              <p className="mt-1.5 text-[13px] text-mv-ink-soft">
                Cliquez le lien reçu à {email} pour accéder à votre compte de fidélité.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                  <Heart size={18} />
                </div>
                <p className="text-[12.5px] text-mv-ink-faint">Programme de fidélité</p>
                <p className="mt-0.5 font-display text-[21px] font-medium text-mv-ink">{landing.restaurantName}</p>
                <p className="mt-2 text-[13px] text-mv-ink-soft">
                  Accumulez {landing.pointsPerDollar} point{landing.pointsPerDollar > 1 ? "s" : ""} par dollar dépensé.
                </p>
              </div>

              {landing.topRewards.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-mv-border-soft pt-4">
                  {landing.topRewards.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-1.5 text-mv-ink-soft">
                        <Gift size={13} className="text-mv-green-dark" /> {r.name}
                      </span>
                      <span className="font-medium text-mv-ink">{r.pointsCost} pts</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-mv-border-soft pt-4">
                <Field label="Votre nom">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Tremblay" required autoFocus />
                </Field>
                <Field label="Courriel">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
                </Field>
                {status === "error" && <p className="text-[12.5px] text-mv-red">{error}</p>}
                <Button type="submit" disabled={status === "sending"} className="w-full">
                  {status === "sending" ? "Envoi…" : "Rejoindre le programme"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
