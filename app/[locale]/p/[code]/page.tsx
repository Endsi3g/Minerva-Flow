import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { PoweredByBadge } from "@/components/minerva/PoweredByBadge";
import { getReferralLandingByCode, recordClick } from "@/lib/data/customer-referrals";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Gift } from "lucide-react";

export default async function ReferralLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`referral-link:${ip}`, { max: 30, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const landing = await getReferralLandingByCode(code);
  if (!landing) notFound();

  await recordClick(code);

  const { program, restaurantName, referrerName } = landing;
  const referrerInitial = referrerName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-mv-cream px-5 py-12 sm:py-16">
      <div
        className="pointer-events-none absolute -top-36 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(22,127,91,0.16) 0%, rgba(22,127,91,0) 70%)" }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <LogoMark size={26} />
          <span className="font-display text-[15px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </div>

        <div className="rounded-[22px] border border-mv-border bg-mv-surface px-6 py-7 text-center shadow-mv-lg">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-[11px] font-bold text-mv-green-dark">
              {referrerInitial}
            </span>
            <p className="text-[12.5px] text-mv-ink-faint">{referrerName} vous invite chez</p>
          </div>

          <h1 className="font-display text-[25px] font-medium leading-tight tracking-tight text-mv-ink">
            {restaurantName}
          </h1>
          {program.description && (
            <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">{program.description}</p>
          )}

          {program.rewardDescription && (
            <div className="mt-5 flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-mv-green/35 bg-mv-green-tint px-4 py-3.5 text-left">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-mv-surface text-mv-green-dark">
                <Gift size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-mv-lime-dark">Votre invitation</p>
                <p className="mt-0.5 text-[14px] font-semibold leading-snug text-mv-green-dark">
                  {program.rewardDescription}
                </p>
              </div>
            </div>
          )}

          <Link href={`/p/${code}/reserver`} className="mt-6 block">
            <Button className="w-full" size="lg">
              <CalendarClock size={16} /> Réserver une table
            </Button>
          </Link>
        </div>

        <div className="mt-5 flex justify-center">
          <PoweredByBadge />
        </div>
      </div>
    </div>
  );
}
