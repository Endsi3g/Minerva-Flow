import { NextResponse } from "next/server";
import { GoogleBusinessHourPeriod, GoogleBusinessProfileError, updateGoogleBusinessHours } from "@/lib/google/business-profile";
import { getGoogleTokens, updateGoogleConnectionMeta } from "@/lib/data/google-connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNativeOwnerContext } from "@/lib/supabase/bearer-user";
import { GOOGLE_SCOPES } from "@/lib/google/config";

export const dynamic = "force-dynamic";

const days = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isPeriod(value: unknown): value is GoogleBusinessHourPeriod {
  if (!value || typeof value !== "object") return false;
  const period = value as Record<string, unknown>;
  return typeof period.openDay === "string" && days.has(period.openDay)
    && typeof period.closeDay === "string" && days.has(period.closeDay)
    && typeof period.openTime === "string" && time.test(period.openTime)
    && typeof period.closeTime === "string" && time.test(period.closeTime);
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null) as { restaurantId?: string; periods?: unknown } | null;
  const auth = await getNativeOwnerContext(request, body?.restaurantId ?? null);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!Array.isArray(body?.periods) || body.periods.length > 28 || !body.periods.every(isPeriod)) {
    return NextResponse.json({ error: "Les horaires doivent utiliser des jours et heures valides." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin.from("google_connections")
    .select("granted_scopes, business_profile_location_name")
    .eq("restaurant_id", auth.context.restaurantId).maybeSingle();
  if (!connection?.granted_scopes?.includes(GOOGLE_SCOPES.business_profile) || !connection.business_profile_location_name) {
    return NextResponse.json({ error: "Connectez et sélectionnez une fiche Google Business Profile." }, { status: 409 });
  }
  const tokens = await getGoogleTokens(auth.context.restaurantId);
  if (!tokens) return NextResponse.json({ error: "Reconnectez Google Business Profile pour continuer." }, { status: 409 });

  try {
    const location = await updateGoogleBusinessHours(tokens.accessToken, connection.business_profile_location_name, body.periods as GoogleBusinessHourPeriod[]);
    await updateGoogleConnectionMeta(auth.context.restaurantId, { businessProfileSyncedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, regularHours: location.regularHours ?? null });
  } catch (cause) {
    const message = cause instanceof GoogleBusinessProfileError ? cause.message : "Impossible de mettre à jour les horaires Google.";
    const status = cause instanceof GoogleBusinessProfileError ? cause.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
