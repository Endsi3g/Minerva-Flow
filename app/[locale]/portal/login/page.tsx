"use client";

import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { requestCustomerMagicLink } from "@/lib/auth/customer-magic-link";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

/** Inline brand marks — matches Google/Meta's own multi-color guidelines
 * rather than a flat icon font glyph, since a monochrome "G" reads as an
 * unofficial/unbranded button. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 6.1 29.6 4 24 4 15.3 4 9.8 8.5 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14-5.4l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.7 39.4 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.5 36 44 30.5 44 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}
function FacebookMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}

export default function PortalLoginPage() {
  const t = useTranslations("portal.login");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState<"google" | "facebook" | null>(null);

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

  /**
   * signInWithOAuth has no equivalent of signInWithOtp's `data:
   * {is_customer: true}` — there's no way to tag a brand-new OAuth user's
   * metadata before handle_new_user() fires. handle_new_user() (see
   * supabase/migrations/0067_oauth_customer_login.sql) instead treats "an
   * unclaimed customers row already exists for this email" as the signal
   * that this is a customer login, so a returning loyalty customer still
   * lands in the portal instead of getting a fake restaurant provisioned.
   * Requires the Google/Facebook providers to actually be enabled in the
   * Supabase dashboard (Authentication → Providers) with real client
   * credentials; until then this button surfaces Supabase's own
   * "provider not enabled" error.
   */
  async function handleOAuth(provider: "google" | "facebook") {
    setOauthBusy(provider);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/portal")}`,
      },
    });
    if (oauthError) {
      setStatus("error");
      setError(t("errorGeneric"));
      setOauthBusy(null);
    }
    // On success the browser navigates away to the provider — no further
    // local state update needed here.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
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
              <Button type="submit" disabled={status === "sending" || oauthBusy !== null} className="w-full">
                {status === "sending" ? t("sending") : t("receiveLink")}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-mv-border-soft" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-mv-ink-faint">ou</span>
                <div className="h-px flex-1 bg-mv-border-soft" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={oauthBusy !== null || status === "sending"}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-mv-border bg-white px-4 py-2.5 text-[13px] font-semibold text-mv-ink transition-colors hover:bg-mv-cream-soft disabled:opacity-60"
                >
                  <GoogleMark /> {oauthBusy === "google" ? "Redirection…" : "Continuer avec Google"}
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("facebook")}
                  disabled={oauthBusy !== null || status === "sending"}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-mv-border bg-white px-4 py-2.5 text-[13px] font-semibold text-mv-ink transition-colors hover:bg-mv-cream-soft disabled:opacity-60"
                >
                  <FacebookMark /> {oauthBusy === "facebook" ? "Redirection…" : "Continuer avec Facebook"}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
