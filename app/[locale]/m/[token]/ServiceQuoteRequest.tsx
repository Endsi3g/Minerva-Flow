"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { submitPublicServiceQuoteAction } from "./actions";

export function ServiceQuoteRequest({ token, restaurantTimezone, deliveryEnabled }: { token: string; restaurantTimezone: string; deliveryEnabled: boolean }) {
  const t = useTranslations("menu.serviceQuote");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteType, setQuoteType] = useState<"catering" | "custom_meal">("catering");
  const [fulfillmentMode, setFulfillmentMode] = useState<"sur_place" | "livraison">("sur_place");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await submitPublicServiceQuoteAction(token, {
        quoteType,
        guestName: String(form.get("guestName") ?? ""),
        guestPhone: String(form.get("guestPhone") ?? ""),
        guestEmail: String(form.get("guestEmail") ?? ""),
        description: String(form.get("description") ?? ""),
        eventAtLocal: String(form.get("eventAtLocal") ?? ""),
        guestCount: quoteType === "catering" ? Number(form.get("guestCount") ?? 0) : null,
        fulfillmentMode,
        deliveryAddress: String(form.get("deliveryAddress") ?? ""),
        clientNotes: String(form.get("clientNotes") ?? ""),
      });
      if (!result.ok) {
        setError(t(result.reason === "rate_limited" ? "rateLimited" : "submitFailed"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setSent(false); setError(null); }}
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-mv-green/25 bg-mv-surface px-4 py-3.5 text-left shadow-mv-sm transition hover:border-mv-green/50 hover:bg-mv-cream-soft">
        <span className="rounded-xl bg-mv-green/10 p-2.5 text-mv-green-dark"><ClipboardList size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-mv-ink">{t("cta")}</span>
          <span className="mt-0.5 block text-[11.5px] text-mv-ink-soft">{t("ctaDescription")}</span>
        </span>
        <CalendarDays size={16} className="text-mv-green-dark" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("title")} description={t("description")}>
        {sent ? (
          <div className="rounded-xl border border-mv-green/20 bg-mv-green/5 p-5 text-center">
            <p className="font-serif text-lg text-mv-ink">{t("successTitle")}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">{t("successDescription")}</p>
            <Button className="mt-4" onClick={() => setOpen(false)}>{t("close")}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-mv-cream-soft p-1">
              {(["catering", "custom_meal"] as const).map((kind) => (
                <button key={kind} type="button" onClick={() => setQuoteType(kind)}
                  className={`rounded-lg px-2 py-2 text-[12px] font-semibold ${quoteType === kind ? "bg-white text-mv-green-dark shadow-sm" : "text-mv-ink-soft"}`}>
                  {t(kind === "catering" ? "catering" : "customMeal")}
                </button>
              ))}
            </div>
            <Field label={t("name")}><Input name="guestName" autoComplete="name" required minLength={2} maxLength={120} /></Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("phone")}><Input name="guestPhone" type="tel" autoComplete="tel" required minLength={7} maxLength={40} /></Field>
              <Field label={t("email")}><Input name="guestEmail" type="email" autoComplete="email" required maxLength={254} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("eventDate")} hint={t("timezoneHint", { timezone: restaurantTimezone })}><Input name="eventAtLocal" type="datetime-local" required /></Field>
              {quoteType === "catering" && <Field label={t("guestCount")}><Input name="guestCount" type="number" min="1" max="5000" required /></Field>}
            </div>
            <Field label={t("details")} hint={t("detailsHint")}>
              <Textarea name="description" required minLength={10} maxLength={2000} rows={4} placeholder={t("detailsPlaceholder")} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              {(["sur_place", ...(deliveryEnabled ? ["livraison" as const] : [])] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setFulfillmentMode(mode)}
                  className={`rounded-lg border px-3 py-2 text-[12px] font-medium ${fulfillmentMode === mode ? "border-mv-green bg-mv-green/5 text-mv-green-dark" : "border-mv-border-soft text-mv-ink-soft"}`}>
                  {t(mode === "sur_place" ? "pickup" : "delivery")}
                </button>
              ))}
            </div>
            {fulfillmentMode === "livraison" && <Field label={t("deliveryAddress")}><Input name="deliveryAddress" required minLength={8} maxLength={500} autoComplete="street-address" /></Field>}
            <Field label={t("notes")}><Textarea name="clientNotes" maxLength={1000} rows={2} placeholder={t("notesPlaceholder")} /></Field>
            {error && <p role="alert" className="text-[12px] text-mv-red">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-mv-border-soft pt-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>{t("cancel")}</Button>
              <Button type="submit" disabled={busy}>{busy ? t("sending") : t("send")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
