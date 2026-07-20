import { LogoMark } from "@/components/shell/Logo";
import { getExpenseShareByToken } from "@/lib/data/expense-shares";
import { formatCurrency, formatDate } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notFound } from "next/navigation";

export default async function SharedExpensePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`expense-share:${ip}`, { max: 30, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const share = await getExpenseShareByToken(token);
  if (!share) notFound();

  const { restaurantName, transaction, createdByName } = share.snapshot;

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{restaurantName}</p>
        <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{transaction.description}</h1>
        <p className="mb-6 text-[13px] text-mv-ink-faint">{formatDate(transaction.date)}</p>

        <div className="rounded-xl border border-mv-border bg-mv-surface p-5">
          <p className="mb-4 font-display text-[26px] font-medium text-mv-ink">{formatCurrency(transaction.amount)}</p>
          <div className="space-y-2.5 border-t border-mv-border-soft pt-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-mv-ink-faint">Catégorie</span>
              <span className="font-medium text-mv-ink">{transaction.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mv-ink-faint">Compte / méthode</span>
              <span className="font-medium text-mv-ink">{transaction.sourceAccount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mv-ink-faint">Créée par</span>
              <span className="font-medium text-mv-ink">{createdByName ?? "Import CSV"}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-[11.5px] text-mv-ink-faint">
          Lien généré via Flow par Minerva — mis à jour au moment de sa création, pas en temps réel.
        </p>
      </div>
    </div>
  );
}
