import { getLoyaltyShareByToken } from "@/lib/data/loyalty-shares";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notFound } from "next/navigation";
import { LoyaltyJoinFlow } from "./LoyaltyJoinFlow";

export default async function PublicLoyaltyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`loyalty-share:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const landing = await getLoyaltyShareByToken(token);
  if (!landing) notFound();

  return <LoyaltyJoinFlow token={token} landing={landing} />;
}
