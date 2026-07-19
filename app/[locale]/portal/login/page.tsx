"use client";

import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { requestCustomerMagicLink } from "@/lib/auth/customer-magic-link";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PortalLoginPage() {
  const t = useTranslations("portal.login");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const result = await requestCustomerMagicLink(email, "/portal");
    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error ?? t("errorGeneric"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6">
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
              <p className="font-display text-[17px] font-medium text-mv-ink">{t("checkEmailTitle")}</p>
              <p className="mt-1.5 text-[13px] text-mv-ink-soft">
                {t("linkSentTo", { email })}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <p className="font-display text-[19px] font-medium text-mv-ink">{t("title")}</p>
                <p className="mt-1 text-[13px] text-mv-ink-soft">
                  {t("subtitle")}
                </p>
              </div>
              <Field label={t("emailLabel")}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  autoFocus
                />
              </Field>
              {status === "error" && <p className="text-[12.5px] text-mv-red">{error}</p>}
              <Button type="submit" disabled={status === "sending"} className="w-full">
                {status === "sending" ? t("sending") : t("receiveLink")}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
