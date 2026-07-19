"use client";

import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { createClient } from "@/lib/supabase/client";
import { MailCheck } from "lucide-react";
import { Link, getPathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
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
      const redirectPath = getPathname({ href: "/update-password", locale });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${redirectPath}`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
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
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
              <MailCheck size={20} />
            </div>
            <h1 className="font-display text-[19px] font-medium text-mv-ink">
              {t("forgotPasswordPage.checkEmailTitle")}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">
              {t("forgotPasswordPage.checkEmailBody", { email })}
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[20px] font-medium text-mv-ink">
              {t("forgotPasswordPage.title")}
            </h1>
            <p className="mt-1 text-[13px] text-mv-ink-soft">
              {t("forgotPasswordPage.subtitle")}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <Field label={t("emailLabel")}>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {error && <p className="text-[12.5px] text-mv-red">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("forgotPasswordPage.sending") : t("forgotPasswordPage.sendLink")}
              </Button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-[12.5px] text-mv-ink-faint">
          <Link href="/login" className="font-semibold text-mv-green-dark hover:underline">
            {t("forgotPasswordPage.backToLogin")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
