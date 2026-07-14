import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import { logActivity } from "@/lib/data/activity";
import type { Role } from "@/lib/types";

const INVITABLE_ROLES: Role[] = ["owner", "manager", "staff", "consultant"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return NextResponse.json({ error: "Aucun établissement courant." }, { status: 400 });
  }

  const membership = await getCurrentMembership();
  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return NextResponse.json(
      { error: "Seuls les propriétaires et gérants peuvent inviter des collaborateurs." },
      { status: 403 }
    );
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role as Role | undefined;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Adresse courriel invalide." }, { status: 400 });
  }
  if (!role || !INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);

  let invitedUserId = invited?.user?.id;

  // "already been registered" -> look up the existing user instead of failing.
  if (inviteError && !invitedUserId) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: inviteError.message || "Impossible d'inviter cette personne." },
        { status: 400 }
      );
    }
    invitedUserId = existing.id;
  }

  if (!invitedUserId) {
    return NextResponse.json({ error: "Impossible d'inviter cette personne." }, { status: 400 });
  }

  const { data: memberRow, error: insertError } = await admin
    .from("restaurant_members")
    .insert({
      restaurant_id: restaurantId,
      user_id: invitedUserId,
      role,
      status: "invited",
    })
    .select("id, restaurant_id, user_id, role, status")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Cette personne fait déjà partie des collaborateurs." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Impossible d'ajouter ce collaborateur." }, { status: 400 });
  }

  await logActivity({
    restaurantId,
    actionType: "team.invite",
    entityType: "restaurant_member",
    entityId: memberRow.id,
    description: `A invité ${email} à rejoindre les collaborateurs`,
  });

  return NextResponse.json({
    member: {
      id: memberRow.user_id,
      membershipId: memberRow.id,
      email,
      role: memberRow.role,
      status: "invite",
    },
  });
}
