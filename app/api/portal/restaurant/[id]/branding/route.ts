import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { getPublicTenantBranding } from "@/lib/data/public-tenant-branding";

/** Public visual identity for a restaurant in the authenticated native app. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveNativeUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const branding = await getPublicTenantBranding(id);
  if (!branding) return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  return NextResponse.json({ branding });
}
