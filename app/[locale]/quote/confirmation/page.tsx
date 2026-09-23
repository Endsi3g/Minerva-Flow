import { getTranslations } from "next-intl/server";
import { getServiceQuoteCheckoutStatus } from "@/lib/stripe/connect";

type ConfirmationState = "paid" | "processing" | "pending" | "cancelled" | "invalid";

export default async function ServiceQuoteConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[]; payment?: string | string[] }>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const payment = typeof params.payment === "string" ? params.payment : "";
  const state: ConfirmationState = payment === "cancelled"
    ? "cancelled"
    : sessionId
      ? await getServiceQuoteCheckoutStatus(sessionId)
      : "invalid";
  const t = await getTranslations("quoteConfirmation");
  const content = {
    paid: { title: t("paidTitle"), body: t("paidBody"), tone: "border-mv-green/20 bg-mv-green/5" },
    processing: { title: t("processingTitle"), body: t("processingBody"), tone: "border-amber-200 bg-amber-50" },
    pending: { title: t("pendingTitle"), body: t("pendingBody"), tone: "border-amber-200 bg-amber-50" },
    cancelled: { title: t("cancelledTitle"), body: t("cancelledBody"), tone: "border-mv-border-soft bg-mv-cream-soft" },
    invalid: { title: t("invalidTitle"), body: t("invalidBody"), tone: "border-mv-border-soft bg-mv-cream-soft" },
  }[state];

  return (
    <main className="min-h-[70vh] bg-mv-cream px-4 py-16 sm:py-24">
      <section className={`mx-auto max-w-xl rounded-2xl border p-6 shadow-mv-sm sm:p-9 ${content.tone}`} aria-live="polite">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mv-green-dark">Minerva Flow</p>
        <h1 className="mt-3 font-serif text-2xl text-mv-ink sm:text-3xl">{content.title}</h1>
        <p className="mt-3 text-sm leading-7 text-mv-ink-soft">{content.body}</p>
      </section>
    </main>
  );
}
