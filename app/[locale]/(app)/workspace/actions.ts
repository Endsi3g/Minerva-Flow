"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspaceMembership } from "@/lib/data/current-workspace";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import {
  getWorkspace,
  getWorkspaceMembers,
  getWorkspaceRestaurants,
  updateWorkspaceName,
  createWorkspace,
  assignRestaurantToWorkspace,
  deleteWorkspace,
  type WorkspaceMemberWithRestaurants,
} from "@/lib/data/workspaces";
import {
  getWorkspaceBranding,
  getWorkspaceDomainVerification,
  updateWorkspaceBranding,
  verifyWorkspaceCustomDomain,
  type WorkspaceDomainVerification,
} from "@/lib/data/workspace-branding";
import type { WorkspaceBrandingInput } from "@/lib/branding/workspace-branding";
import {
  createInviteLink,
  listInvites,
  type WorkspaceInvite,
  type WorkspaceInviteListEntry,
} from "@/lib/data/workspace-invites";
import type { Restaurant, Role, Workspace } from "@/lib/types";
import type { WorkspaceBranding } from "@/lib/branding/workspace-branding";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateFlowAmbassador, getFlowAmbassadorSummary, notifyFlowAmbassador, type FlowAmbassadorSummary } from "@/lib/data/flow-ambassadors";
import { createExpressAccount, createOnboardingLink, retrieveAccountState } from "@/lib/stripe/connect";
import { getStripeClient } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";

async function requireWorkspaceManager(workspaceId: string) {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership || membership.workspaceId !== workspaceId) return null;
  if (!["owner", "manager"].includes(membership.role)) return null;
  return membership;
}

export type WorkspaceHubData = {
  workspace: Workspace;
  members: WorkspaceMemberWithRestaurants[];
  restaurants: Restaurant[];
  canManage: boolean;
  branding: WorkspaceBranding | null;
  canManageBrand: boolean;
  domainVerification: WorkspaceDomainVerification | null;
};

/** Bootstraps the /workspace hub — null means the current restaurant has no workspace yet. */
export async function getWorkspaceHubDataAction(): Promise<WorkspaceHubData | null> {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership) return null;

  const [workspace, members, restaurants, branding, domainVerification] = await Promise.all([
    getWorkspace(membership.workspaceId),
    getWorkspaceMembers(membership.workspaceId),
    getWorkspaceRestaurants(membership.workspaceId),
    getWorkspaceBranding(membership.workspaceId),
    membership.role === "owner" ? getWorkspaceDomainVerification(membership.workspaceId) : Promise.resolve(null),
  ]);
  if (!workspace) return null;

  return {
    workspace,
    members,
    restaurants,
    branding,
    canManage: ["owner", "manager"].includes(membership.role),
    canManageBrand: membership.role === "owner",
    domainVerification,
  };
}

export async function joinFlowAmbassadorProgramAction(): Promise<FlowAmbassadorSummary | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const wasAmbassador = await getFlowAmbassadorSummary(user.id);
  const code = await getOrCreateFlowAmbassador(user.id);
  if (code && !wasAmbassador) await notifyFlowAmbassador(user.id, { kind: "welcome" });
  return code ? getFlowAmbassadorSummary(user.id) : null;
}

export async function createAmbassadorTrackingLinkAction(input: { label: string; platform: string; contentUrl?: string }): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const label = input.label.trim().slice(0, 120);
  const platform = input.platform;
  const contentUrl = input.contentUrl?.trim();
  if (label.length < 2 || !["instagram", "tiktok", "youtube", "linkedin", "facebook", "other"].includes(platform)) return false;
  if (contentUrl && (!/^https:\/\//i.test(contentUrl) || contentUrl.length > 2048)) return false;
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!ambassador) return false;
  const { error } = await admin.from("flow_ambassador_links").insert({
    ambassador_id: ambassador.id, slug: randomBytes(6).toString("hex"), label, platform, content_url: contentUrl || null,
  });
  revalidatePath("/workspace/ambassadeurs");
  return !error;
}

export async function disconnectAmbassadorInstagramAction(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors").select("id").eq("user_id", user.id).maybeSingle();
  if (!ambassador) return false;
  const { data: connection } = await admin.from("flow_ambassador_instagram_connections").select("access_token_id").eq("ambassador_id", ambassador.id).maybeSingle();
  if (!connection) return true;
  const { error: vaultError } = await admin.rpc("delete_vault_secret", { secret_id: connection.access_token_id });
  if (vaultError) return false;
  const { error } = await admin.from("flow_ambassador_instagram_connections").delete().eq("ambassador_id", ambassador.id);
  revalidatePath("/workspace/ambassadeurs");
  return !error;
}

export async function getFlowAmbassadorPageAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const summary = await getFlowAmbassadorSummary(user.id);
  const [{ data: profiles }, { data: ambassadorRow }, membership] = await Promise.all([
    admin.from("flow_ugc_restaurant_profiles").select("id, display_name, city, approved_quote, public_url").eq("is_active", true).order("display_name"),
    admin.from("flow_ambassadors").select("id, stripe_account_id").eq("user_id", user.id).maybeSingle(),
    getCurrentMembership(),
  ]);
  let submissions: { id: string; platform: string; post_url: string; status: string; created_at: string; display_name: string }[] = [];
  if (ambassadorRow?.id) {
    const { data } = await admin.from("flow_ugc_submissions").select("id, platform, post_url, status, created_at, flow_ugc_restaurant_profiles!inner(display_name)")
      .eq("ambassador_id", ambassadorRow.id).order("created_at", { ascending: false }).limit(20);
    submissions = ((data ?? []) as unknown as { id: string; platform: string; post_url: string; status: string; created_at: string; flow_ugc_restaurant_profiles: { display_name: string } }[])
      .map(({ flow_ugc_restaurant_profiles, ...row }) => ({ ...row, display_name: flow_ugc_restaurant_profiles.display_name }));
  }
  let payoutsEnabled = false;
  if (ambassadorRow?.stripe_account_id) {
    try { payoutsEnabled = (await retrieveAccountState(ambassadorRow.stripe_account_id)).payoutsEnabled; } catch { payoutsEnabled = false; }
  }
  let instagramConnection: { username: string | null; expiresAt: string | null } | null = null;
  if (ambassadorRow?.id) {
    const { data } = await admin.from("flow_ambassador_instagram_connections").select("username, expires_at").eq("ambassador_id", ambassadorRow.id).maybeSingle();
    if (data) instagramConnection = { username: (data.username as string | null) ?? null, expiresAt: (data.expires_at as string | null) ?? null };
  }
  let ownRestaurant: { name: string; city: string } | null = null;
  let ownProfileActive = false;
  if (membership?.role === "owner") {
    const { data } = await admin.from("restaurants").select("name, city").eq("id", membership.restaurantId).maybeSingle();
    if (data) ownRestaurant = { name: data.name as string, city: (data.city as string | null) ?? "" };
    const { data: profile } = await admin.from("flow_ugc_restaurant_profiles").select("is_active").eq("restaurant_id", membership.restaurantId).maybeSingle();
    ownProfileActive = Boolean(profile?.is_active);
  }
  return {
    asOf: new Date().toISOString(),
    summary,
    profiles: (profiles ?? []).map((row) => ({ id: row.id as string, name: row.display_name as string, city: (row.city as string | null) ?? "", quote: (row.approved_quote as string | null) ?? "", publicUrl: (row.public_url as string | null) ?? "" })),
    submissions,
    payoutsEnabled,
    canOptInRestaurant: Boolean(ownRestaurant),
    ownRestaurant,
    ownProfileActive,
    instagramConnection,
  };
}

export async function createAmbassadorPayoutOnboardingAction(locale: string): Promise<string | null> {
  if (!["fr", "en", "tr"].includes(locale)) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors").select("id, stripe_account_id").eq("user_id", user.id).maybeSingle();
  if (!ambassador) return null;
  try {
    let accountId = ambassador.stripe_account_id as string | null;
    if (!accountId) {
      accountId = await createExpressAccount(user.email ?? null);
      const { error } = await admin.from("flow_ambassadors").update({ stripe_account_id: accountId }).eq("id", ambassador.id);
      if (error) return null;
    }
    const base = `/${locale}/workspace/ambassadeurs`;
    return await createOnboardingLink(accountId, `${base}?stripe=refresh`, `${base}?stripe=return`);
  } catch {
    return null;
  }
}

export async function requestAmbassadorPayoutAction(commissionId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(commissionId)) return { ok: false, message: "Session invalide." };
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors").select("id, stripe_account_id").eq("user_id", user.id).maybeSingle();
  if (!ambassador?.stripe_account_id) return { ok: false, message: "Connectez d’abord votre compte de versement Stripe." };
  const { data: commission } = await admin.from("flow_ambassador_commissions")
    .select("id, referral_id, commission_amount, currency, payable_at, status, stripe_transfer_id, flow_ambassador_referrals!inner(ambassador_id)")
    .eq("id", commissionId).maybeSingle();
  const owner = (commission?.flow_ambassador_referrals as unknown as { ambassador_id: string } | null)?.ambassador_id;
  if (!commission || owner !== ambassador.id) return { ok: false, message: "Commission introuvable." };
  if (commission.stripe_transfer_id) return { ok: true, message: "Ce versement a déjà été envoyé à Stripe." };
  if (commission.status === "pending" && new Date(commission.payable_at).getTime() <= Date.now()) {
    await admin.from("flow_ambassador_commissions").update({ status: "payable" }).eq("id", commissionId).eq("status", "pending");
  }
  if (new Date(commission.payable_at).getTime() > Date.now()) return { ok: false, message: "Cette commission doit attendre la fin du délai de 30 jours." };
  if (!(["payable", "pending"].includes(commission.status))) return { ok: false, message: "Cette commission ne peut pas être versée." };
  try {
    const state = await retrieveAccountState(ambassador.stripe_account_id as string);
    if (!state.payoutsEnabled) return { ok: false, message: "Stripe doit encore vérifier votre compte de versement." };
    const amount = Math.round(Number(commission.commission_amount) * 100);
    const currency = String(commission.currency).toLowerCase();
    const transfer = await getStripeClient().transfers.create({
      amount,
      currency,
      destination: ambassador.stripe_account_id as string,
      transfer_group: `ambassador_${commissionId}`,
      metadata: { flow_ambassador_commission_id: commissionId, ambassador_user_id: user.id },
    }, { idempotencyKey: `flow-ambassador-payout-${commissionId}` });
    const { error } = await admin.from("flow_ambassador_commissions").update({
      status: "paid", stripe_transfer_id: transfer.id, payout_reference: transfer.id, settled_at: new Date().toISOString(),
    }).eq("id", commissionId).is("stripe_transfer_id", null);
    if (error) return { ok: false, message: "Le transfert est créé, mais son enregistrement doit être réconcilié." };
    await notifyFlowAmbassador(user.id, {
      kind: "payout", commissionAmount: Number(commission.commission_amount),
      currency: String(commission.currency), payoutReference: transfer.id,
    });
    return { ok: true, message: "Commission transférée vers votre compte Stripe. Le dépôt bancaire suit le calendrier Stripe." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfert Stripe indisponible.";
    return { ok: false, message: message.slice(0, 180) };
  }
}

export async function optInRestaurantForAmbassadorUgcAction(input: { displayName: string; city: string }): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") return false;
  const displayName = input.displayName.trim().slice(0, 120);
  const city = input.city.trim().slice(0, 100);
  if (displayName.length < 2) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await createAdminClient().from("flow_ugc_restaurant_profiles").upsert({
    restaurant_id: membership.restaurantId, display_name: displayName, city: city || null,
    consented_by: user.id, consented_at: new Date().toISOString(), is_active: true, updated_at: new Date().toISOString(),
  }, { onConflict: "restaurant_id" });
  revalidatePath("/workspace/ambassadeurs");
  return !error;
}

export async function withdrawRestaurantFromAmbassadorUgcAction(): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") return false;
  const { error } = await createAdminClient().from("flow_ugc_restaurant_profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("restaurant_id", membership.restaurantId);
  revalidatePath("/workspace/ambassadeurs");
  return !error;
}

export async function submitAmbassadorUgcAction(input: {
  restaurantProfileId: string; platform: string; postUrl: string; caption: string;
  disclosureConfirmed: boolean; usageRightsConfirmed: boolean; referralLinkId?: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !input.disclosureConfirmed || !input.usageRightsConfirmed || !/^https:\/\//i.test(input.postUrl)) return false;
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors").select("id").eq("user_id", user.id).maybeSingle();
  if (!ambassador) return false;
  const { data: profile } = await admin.from("flow_ugc_restaurant_profiles").select("id").eq("id", input.restaurantProfileId).eq("is_active", true).maybeSingle();
  if (!profile) return false;
  let referralLinkId: string | null = null;
  if (input.referralLinkId) {
    const { data: link } = await admin.from("flow_ambassador_links").select("id").eq("id", input.referralLinkId).eq("ambassador_id", ambassador.id).maybeSingle();
    if (!link) return false;
    referralLinkId = link.id as string;
  }
  const caption = input.caption.trim().slice(0, 2000);
  if (!caption.toLowerCase().includes("#minervaflow")) return false;
  const { error } = await admin.from("flow_ugc_submissions").insert({
    ambassador_id: ambassador.id, restaurant_profile_id: profile.id,
    platform: input.platform, post_url: input.postUrl.slice(0, 2048), caption, referral_link_id: referralLinkId,
    disclosure_confirmed: true, usage_rights_confirmed: true,
  });
  revalidatePath("/workspace/ambassadeurs");
  return !error;
}

export async function verifyWorkspaceBrandDomainAction(workspaceId: string): Promise<boolean> {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership || membership.workspaceId !== workspaceId || membership.role !== "owner") return false;
  const verified = await verifyWorkspaceCustomDomain(workspaceId);
  revalidatePath("/workspace");
  return verified;
}

export async function updateWorkspaceBrandingAction(
  workspaceId: string,
  input: WorkspaceBrandingInput
): Promise<boolean> {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership || membership.workspaceId !== workspaceId || membership.role !== "owner") return false;

  try {
    const branding = await updateWorkspaceBranding(workspaceId, input);
    if (!branding) return false;
    revalidatePath("/workspace");
    return true;
  } catch {
    return false;
  }
}

/** For the current restaurant, when it has no workspace yet — creates one and links it. */
export async function createWorkspaceForCurrentRestaurantAction(name: string): Promise<boolean> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId || !name.trim()) return false;

  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return false;
  }

  const workspace = await createWorkspace(name);
  if (!workspace) return false;

  const ok = await assignRestaurantToWorkspace(restaurantId, workspace.id);
  if (ok) {
    revalidatePath("/workspace");
  } else {
    // Assignment failed (e.g. the restaurant got assigned elsewhere in a
    // race) — don't leave an empty, ownerless-looking workspace behind.
    await deleteWorkspace(workspace.id);
  }
  return ok;
}

export async function renameWorkspaceAction(workspaceId: string, name: string): Promise<boolean> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership) return false;

  const ok = await updateWorkspaceName(workspaceId, name);
  if (ok) revalidatePath("/workspace");
  return ok;
}

/** Assigns one of the current user's own restaurants (not yet in any workspace) to this workspace. */
export async function assignRestaurantToWorkspaceAction(
  restaurantId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership) return false;

  const ok = await assignRestaurantToWorkspace(restaurantId, workspaceId);
  if (ok) revalidatePath("/workspace");
  return ok;
}

// Deliberately excludes "owner" — Role is erased at runtime, so without this
// allowlist a manager could call this action directly (bypassing the invite
// modal's own role dropdown) and mint themselves or anyone else a co-owner.
const INVITABLE_ROLES: Role[] = ["manager", "staff", "consultant"];

export async function createWorkspaceInviteLinkAction(
  workspaceId: string,
  role: Role,
  restaurantIds: string[],
  email?: string
): Promise<WorkspaceInvite | null> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership || !INVITABLE_ROLES.includes(role)) return null;

  return createInviteLink(workspaceId, role, restaurantIds, email);
}

export async function listWorkspaceInvitesAction(workspaceId: string): Promise<WorkspaceInviteListEntry[]> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership) return [];

  return listInvites(workspaceId);
}
