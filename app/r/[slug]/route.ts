import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const admin = createAdminClient();
  const { data: link } = await admin.from("flow_ambassador_links")
    .select("id, flow_ambassadors!inner(code, status)")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) return NextResponse.redirect(new URL("/fr/sign-up", request.url));
  const ambassador = link.flow_ambassadors as unknown as { code: string; status: string };
  if (ambassador.status !== "active") return NextResponse.redirect(new URL("/fr/sign-up", request.url));

  const referer = request.headers.get("referer");
  let referrerHost: string | null = null;
  try { if (referer) referrerHost = new URL(referer).hostname.slice(0, 255); } catch { /* discard invalid referrer */ }
  await admin.from("flow_ambassador_link_clicks").insert({ link_id: link.id, referrer_host: referrerHost });

  const destination = new URL("/fr/sign-up", request.url);
  destination.searchParams.set("amb", ambassador.code);
  destination.searchParams.set("ref_link", slug);
  return NextResponse.redirect(destination, { status: 302 });
}
