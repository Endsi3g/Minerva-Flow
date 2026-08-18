import { getProspectByDemoSlug, incrementProspectDemoView } from "@/lib/data/prospects";
import { estimateMargin } from "@/lib/prospects/margin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { formatCurrency } from "@/lib/utils";
import { LogoMark } from "@/components/shell/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { notFound } from "next/navigation";
import {
  TrendingDown,
  UtensilsCrossed,
  CalendarCheck,
  Mail,
  Home,
  MessageSquare,
  Wallet,
  ClipboardList,
  Users,
  PackageSearch,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const ECOSYSTEM_ITEMS: { key: string; icon: LucideIcon }[] = [
  { key: "overview", icon: Home },
  { key: "assistant", icon: MessageSquare },
  { key: "finance", icon: Wallet },
  { key: "commandes", icon: ClipboardList },
  { key: "collaborateurs", icon: Users },
  { key: "inventaire", icon: PackageSearch },
];

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

  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL;
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const ctaHref = bookingUrl || (contactEmail ? `mailto:${contactEmail}` : undefined);

  return (
    <div className="min-h-screen bg-mv-cream">
      <header className="border-b border-mv-border bg-mv-cream-soft">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <LogoMark size={24} />
            <div className="min-w-0">
              <p className="truncate font-display text-[14.5px] font-medium leading-tight text-mv-ink sm:text-[16px]">
                {prospect.restaurantName}
              </p>
              <p className="text-[11px] text-mv-ink-faint sm:text-[11.5px]">{t("poweredBy")}</p>
            </div>
          </div>
          <Badge tone="lime" className="shrink-0">
            {t("previewBadge")}
          </Badge>
        </div>
      </header>

      {margin.monthlyLossCents > 0 && (
        <div className="border-b border-mv-border bg-mv-ink px-4 py-3 text-center sm:px-5 sm:py-3.5">
          <p className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-1.5 text-[12.5px] font-medium text-mv-cream-soft sm:text-[13px]">
            <TrendingDown size={15} className="shrink-0 text-mv-lime" />
            <span>{t("savingsBannerPrefix")}</span>
            <span className="font-display text-[14px] font-semibold text-mv-lime sm:text-[15px]">
              {formatCurrency(margin.monthlyLossCents / 100)}
            </span>
            <span>{t("savingsBannerSuffix")}</span>
          </p>
        </div>
      )}

      <main className="mx-auto max-w-3xl space-y-7 px-4 py-6 sm:space-y-8 sm:px-5 sm:py-8">
        {prospect.menu.isPlaceholder && (
          <p className="rounded-xl border border-dashed border-mv-border bg-mv-cream-soft px-4 py-2.5 text-center text-[12.5px] text-mv-ink-faint">
            {t("placeholderNotice")}
          </p>
        )}

        {prospect.menu.categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-3 font-display text-[17px] font-medium text-mv-ink sm:text-[19px]">
              {category.name}
            </h2>
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

        {margin.monthlyLossCents > 0 && (
          <section className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-md sm:p-6">
            <h2 className="mb-2 font-display text-[17px] font-medium text-mv-ink sm:text-[19px]">
              {t("solution.title")}
            </h2>
            <p className="mb-4 text-[13px] leading-relaxed text-mv-ink-soft">{t("solution.body")}</p>
            <ol className="mb-5 space-y-2.5">
              {(t.raw("solution.steps") as string[]).map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mv-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-[11px] font-semibold text-mv-green-dark">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            {ctaHref && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button href={ctaHref} className="w-full sm:w-auto">
                  {bookingUrl ? (
                    <CalendarCheck data-icon="inline-start" size={15} />
                  ) : (
                    <Mail data-icon="inline-start" size={15} />
                  )}
                  {t("solution.cta")}
                </Button>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-mv-border bg-mv-cream-soft p-5 sm:p-6">
          <h2 className="mb-1 font-display text-[16px] font-medium text-mv-ink sm:text-[17px]">
            {t("ecosystem.title")}
          </h2>
          <p className="mb-4 text-[12.5px] leading-relaxed text-mv-ink-soft">{t("ecosystem.intro")}</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ECOSYSTEM_ITEMS.map(({ key, icon: Icon }) => (
              <div key={key} className="flex items-start gap-2.5 rounded-xl bg-mv-surface p-3 shadow-mv-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-mv-ink">{t(`ecosystem.items.${key}.title`)}</p>
                  <p className="text-[11.5px] leading-relaxed text-mv-ink-soft">
                    {t(`ecosystem.items.${key}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-mv-border px-4 py-6 text-center sm:px-5">
        <p className="text-[11.5px] text-mv-ink-faint">{t("footerNote")}</p>
      </footer>
    </div>
  );
}
