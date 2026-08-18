import { getProspectByDemoSlug, incrementProspectDemoView } from "@/lib/data/prospects";
import { estimateMargin } from "@/lib/prospects/margin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { formatCurrency } from "@/lib/utils";
import { LogoMark } from "@/components/shell/Logo";
import { Badge } from "@/components/ui/Badge";
import { notFound } from "next/navigation";
import { TrendingDown, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ProspectDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`demo:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const prospect = await getProspectByDemoSlug(slug);
  if (!prospect) notFound();

  await incrementProspectDemoView(slug);

  const t = await getTranslations("demo");
  const margin = estimateMargin(prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders);

  return (
    <div className="min-h-screen bg-mv-cream">
      <header className="border-b border-mv-border bg-mv-cream-soft">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <div>
              <p className="font-display text-[16px] font-medium leading-tight text-mv-ink">
                {prospect.restaurantName}
              </p>
              <p className="text-[11.5px] text-mv-ink-faint">{t("poweredBy")}</p>
            </div>
          </div>
          <Badge tone="lime">{t("previewBadge")}</Badge>
        </div>
      </header>

      {margin.monthlyLossCents > 0 && (
        <div className="border-b border-mv-border bg-mv-ink px-5 py-3.5 text-center">
          <p className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-1.5 text-[13px] font-medium text-mv-cream-soft">
            <TrendingDown size={15} className="shrink-0 text-mv-lime" />
            <span>{t("savingsBannerPrefix")}</span>
            <span className="font-display text-[15px] font-semibold text-mv-lime">
              {formatCurrency(margin.monthlyLossCents / 100)}
            </span>
            <span>{t("savingsBannerSuffix")}</span>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
        {prospect.menu.isPlaceholder && (
          <p className="rounded-xl border border-dashed border-mv-border bg-mv-cream-soft px-4 py-2.5 text-center text-[12.5px] text-mv-ink-faint">
            {t("placeholderNotice")}
          </p>
        )}

        {prospect.menu.categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-3 font-display text-[19px] font-medium text-mv-ink">{category.name}</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-mv-border bg-mv-surface p-3.5 shadow-mv-sm"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
                    <UtensilsCrossed size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-semibold text-mv-ink">{item.name}</p>
                      <p className="shrink-0 font-display text-[13.5px] font-medium text-mv-green-dark">
                        {formatCurrency(item.priceCents / 100)}
                      </p>
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-mv-ink-soft">{item.description}</p>
                    )}
                    {!item.inStock && (
                      <Badge tone="neutral" className="mt-1.5">
                        {t("outOfStock")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-mv-border px-5 py-6 text-center">
        <p className="text-[11.5px] text-mv-ink-faint">{t("footerNote")}</p>
      </footer>
    </div>
  );
}
