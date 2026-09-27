import { NextResponse } from "next/server";
import { GOOGLE_SCOPES, isGoogleConfigured } from "@/lib/google/config";
import { GoogleBusinessProfileError, listGoogleBusinessAccounts, listGoogleBusinessLocations } from "@/lib/google/business-profile";
import { getGoogleTokens, updateGoogleConnectionMeta } from "@/lib/data/google-connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNativeOwnerContext } from "@/lib/supabase/bearer-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await getNativeOwnerContext(request, url.searchParams.get("restaurantId"));
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!isGoogleConfigured()) {
    return NextResponse.json({ configured: false, connected: false, locations: [], error: "Google Business Profile n’est pas configuré sur ce serveur." });
  }

  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("google_connections")
    .select("connected_email, granted_scopes, business_profile_account_name, business_profile_location_name, business_profile_location_title")
    .eq("restaurant_id", auth.context.restaurantId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Impossible de lire la connexion Google de cet espace." }, { status: 500 });

  const connected = Boolean(connection?.granted_scopes?.includes(GOOGLE_SCOPES.business_profile));
  if (!connected) {
    return NextResponse.json({ configured: true, connected: false, connectedEmail: null, selectedLocation: null, locations: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const tokens = await getGoogleTokens(auth.context.restaurantId);
  if (!tokens) return NextResponse.json({ configured: true, connected: false, error: "Reconnectez Google Business Profile pour continuer." }, { status: 409 });

  try {
    const accounts = await listGoogleBusinessAccounts(tokens.accessToken);
    const locations = (await Promise.all(accounts.map(async (account) => {
      try {
        return (await listGoogleBusinessLocations(tokens.accessToken, account.name)).map((location) => ({
          accountName: account.name,
          locationName: location.name,
          title: location.title,
          regularHours: location.regularHours ?? null,
          placeId: location.metadata?.placeId ?? null,
          websiteUri: location.websiteUri ?? null,
        }));
      } catch (cause) {
        if (cause instanceof GoogleBusinessProfileError && cause.status === 403) return [];
        throw cause;
      }
    }))).flat();

    return NextResponse.json({
      configured: true,
      connected: true,
      connectedEmail: connection?.connected_email ?? null,
      selectedLocation: connection?.business_profile_location_name ? {
        accountName: connection.business_profile_account_name,
        locationName: connection.business_profile_location_name,
        title: connection.business_profile_location_title,
      } : null,
      locations,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof GoogleBusinessProfileError ? cause.message : "Google Business Profile est temporairement indisponible.";
    const status = cause instanceof GoogleBusinessProfileError ? cause.status : 502;
    return NextResponse.json({ configured: true, connected: true, error: message }, { status });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { restaurantId?: string; accountName?: string; locationName?: string } | null;
  const auth = await getNativeOwnerContext(request, body?.restaurantId ?? null);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!body?.accountName || !body.locationName) return NextResponse.json({ error: "Choisissez une fiche Google." }, { status: 400 });

  const admin = createAdminClient();
  const { data: connection } = await admin.from("google_connections").select("granted_scopes").eq("restaurant_id", auth.context.restaurantId).maybeSingle();
  if (!connection?.granted_scopes?.includes(GOOGLE_SCOPES.business_profile)) return NextResponse.json({ error: "Connectez Google Business Profile avant de choisir une fiche." }, { status: 409 });

  const tokens = await getGoogleTokens(auth.context.restaurantId);
  if (!tokens) return NextResponse.json({ error: "Reconnectez Google Business Profile pour continuer." }, { status: 409 });

  try {
    const locations = await listGoogleBusinessLocations(tokens.accessToken, body.accountName);
    const selected = locations.find((location) => location.name === body.locationName);
    if (!selected) return NextResponse.json({ error: "Cette fiche n’est pas accessible avec le compte Google connecté." }, { status: 403 });
    await updateGoogleConnectionMeta(auth.context.restaurantId, {
      businessProfileAccountName: body.accountName,
      businessProfileLocationName: selected.name,
      businessProfileLocationTitle: selected.title,
    });
    if (selected.metadata?.placeId) {
      const { error: placeError } = await admin.from("restaurants").update({ google_place_id: selected.metadata.placeId }).eq("id", auth.context.restaurantId);
      if (placeError) return NextResponse.json({ error: "Fiche liée, mais son identifiant Google Maps n’a pas pu être enregistré." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, selectedLocation: { name: selected.name, title: selected.title } }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof GoogleBusinessProfileError ? cause.message : "Impossible de lier cette fiche Google.";
    const status = cause instanceof GoogleBusinessProfileError ? cause.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
