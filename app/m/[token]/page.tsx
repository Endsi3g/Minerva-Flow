import { getMenuShareByToken } from "@/lib/data/menu-shares";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MenuOrderFlow } from "./MenuOrderFlow";

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { token } = await params;
  const { ref } = await searchParams;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`menu-share:${ip}`, { max: 60, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const landing = await getMenuShareByToken(token);
  if (!landing) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <MenuOrderFlow token={token} referralCode={ref ?? null} landing={landing} authenticated={Boolean(user)} />;
}
