import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Minerva <span className="text-mv-green-dark">Flow</span>
          </span>
        </div>
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-md">
          <p className="text-[12.5px] text-mv-ink-faint">{referrerName} vous invite chez</p>
          <h1 className="mt-1 font-display text-[24px] font-medium text-mv-ink">{restaurantName}</h1>
          {program.description && <p className="mt-2 text-[13px] text-mv-ink-soft">{program.description}</p>}
          {program.rewardDescription && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-mv-green-dark">
              <Gift size={14} /> {program.rewardDescription}
            </p>
          )}
          <Link href={`/p/${code}/reserver`} className="mt-6 block">
            <Button className="w-full">
              <CalendarClock size={15} /> Réserver une table
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
