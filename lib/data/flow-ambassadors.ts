import "server-only";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFlowAmbassadorEmail } from "@/lib/email/resend";
import { notifyUser } from "@/lib/data/notifications";

export type FlowAmbassadorSummary = {
  code: string;
  referrals: number;
  links: { id: string; slug: string; label: string; platform: string | null; contentUrl: string | null; clicks: number; signups: number }[];
  stripeConnected: boolean;
  commissions: { id: string; amount: number; currency: string; payableAt: string; status: string; transferId: string | null; approvedAt: string | null }[];
};

export async function getOrCreateFlowAmbassador(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("flow_ambassadors").select("code").eq("user_id", userId).maybeSingle();
  if (existing?.code) return existing.code as string;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = `MF${randomBytes(4).toString("hex").toUpperCase()}`;
    const { data, error } = await admin.from("flow_ambassadors")
      .insert({ user_id: userId, code })
      .select("code")
      .single();
    if (data?.code) return data.code as string;
    if (!error?.message.toLowerCase().includes("duplicate")) break;
  }
  return null;
}

export async function getFlowAmbassadorSummary(userId: string): Promise<FlowAmbassadorSummary | null> {
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors")
    .select("id, code, stripe_account_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!ambassador) return null;
  const [{ data: referrals }, { data: initialLinks }] = await Promise.all([
    admin.from("flow_ambassador_referrals").select("id, referral_link_id").eq("ambassador_id", ambassador.id),
    admin.from("flow_ambassador_link_stats").select("id, slug, label, platform, content_url, clicks, signups").eq("ambassador_id", ambassador.id).order("created_at", { ascending: false }),
  ]);
  let linkRows = initialLinks;
  if (!linkRows?.length) {
    await admin.from("flow_ambassador_links").insert({ ambassador_id: ambassador.id, slug: randomBytes(6).toString("hex"), label: "Lien personnel", platform: null });
    const refreshed = await admin.from("flow_ambassador_link_stats").select("id, slug, label, platform, content_url, clicks, signups").eq("ambassador_id", ambassador.id).order("created_at", { ascending: false });
    linkRows = refreshed.data;
  }
  const referralRows = (referrals ?? []) as { id: string; referral_link_id: string | null }[];
  const referralIds = referralRows.map((row) => row.id);
  if (referralIds.length) {
    await admin.from("flow_ambassador_commissions")
      .update({ status: "payable" })
      .eq("status", "pending")
      .lte("payable_at", new Date().toISOString())
      .in("referral_id", referralIds);
  }
  const { data: commissions } = referralIds.length
    ? await admin.from("flow_ambassador_commissions")
        .select("id, commission_amount, currency, payable_at, status, stripe_transfer_id, payout_approved_at")
        .in("referral_id", referralIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  return {
    code: ambassador.code as string,
    referrals: referralIds.length,
    links: ((linkRows ?? []) as { id: string; slug: string; label: string; platform: string | null; content_url: string | null; clicks: number; signups: number }[]).map((row) => ({
      id: row.id, slug: row.slug, label: row.label, platform: row.platform, contentUrl: row.content_url,
      clicks: Number(row.clicks) || 0, signups: Number(row.signups) || 0,
    })),
    stripeConnected: Boolean(ambassador.stripe_account_id),
    commissions: ((commissions ?? []) as { id: string; commission_amount: number; currency: string; payable_at: string; status: string; stripe_transfer_id: string | null; payout_approved_at: string | null }[])
      .map((row) => ({ id: row.id, amount: Number(row.commission_amount), currency: row.currency.toUpperCase(), payableAt: row.payable_at, status: row.status, transferId: row.stripe_transfer_id, approvedAt: row.payout_approved_at })),
  };
}

export async function attributeFlowAmbassadorSignup(code: string, userId: string, workspaceId: string, linkSlug?: string): Promise<void> {
  const admin = createAdminClient();
  const { data: ambassador } = await admin.from("flow_ambassadors")
    .select("id, user_id")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle();
  if (!ambassador || ambassador.user_id === userId) return;
  let referralLinkId: string | null = null;
  if (linkSlug) {
    const { data: link } = await admin.from("flow_ambassador_links").select("id")
      .eq("slug", linkSlug).eq("ambassador_id", ambassador.id).maybeSingle();
    referralLinkId = (link?.id as string | undefined) ?? null;
  }
  await admin.from("flow_ambassador_referrals").upsert({
    ambassador_id: ambassador.id,
    referred_user_id: userId,
    referred_workspace_id: workspaceId,
    referral_link_id: referralLinkId,
  }, { onConflict: "referred_user_id", ignoreDuplicates: true });
}

export async function notifyFlowAmbassador(userId: string, input: {
  kind: "welcome" | "commission" | "payout" | "ugc-approved" | "ugc-revision";
  commissionAmount?: number;
  currency?: string;
  payableAt?: string;
  payoutReference?: string;
  restaurantName?: string;
  reviewNote?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const [{ data: user }, { data: membership }, { data: customer }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("restaurant_members").select("restaurant_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
    admin.from("customers").select("restaurant_id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (user.user?.email) {
    await sendFlowAmbassadorEmail({ to: user.user.email, ...input }).catch(() => false);
  }
  const restaurantId = (membership?.restaurant_id ?? customer?.restaurant_id) as string | undefined;
  if (!restaurantId) return;
  if (input.kind === "welcome") {
    await notifyUser({
      restaurantId,
      userId,
      type: "flow_ambassador.joined",
      title: "Votre lien ambassadeur est prêt",
      body: "Partagez Minerva Flow et suivez vos recommandations depuis le workspace.",
      link: "/workspace/ambassadeurs",
    });
  } else if (input.kind === "commission") {
    const amount = new Intl.NumberFormat("fr-CA", { style: "currency", currency: (input.currency ?? "CAD").toUpperCase() }).format(input.commissionAmount ?? 0);
    const date = input.payableAt ? new Date(input.payableAt).toLocaleDateString("fr-CA") : "";
    await notifyUser({
      restaurantId,
      userId,
      type: "flow_ambassador.commission",
      title: `Commission enregistrée · ${amount}`,
      body: `La commission sera payable après 30 jours, à partir du ${date}.`,
      link: "/workspace/ambassadeurs",
    });
  } else if (input.kind === "payout") {
    const amount = new Intl.NumberFormat("fr-CA", { style: "currency", currency: (input.currency ?? "CAD").toUpperCase() }).format(input.commissionAmount ?? 0);
    await notifyUser({
      restaurantId,
      userId,
      type: "flow_ambassador.payout",
      title: `Versement envoyé · ${amount}`,
      body: "Le transfert a été envoyé à Stripe; le dépôt bancaire suit son calendrier.",
      link: "/workspace/ambassadeurs",
    });
  } else {
    const approved = input.kind === "ugc-approved";
    await notifyUser({
      restaurantId,
      userId,
      type: approved ? "flow_ambassador.ugc_approved" : "flow_ambassador.ugc_revision",
      title: approved ? "Votre contenu ambassadeur est approuvé" : "Une modification est demandée pour votre contenu",
      body: approved ? `Votre publication pour ${input.restaurantName ?? "le restaurant partenaire"} est approuvée.` : (input.reviewNote || "Consultez les notes de révision dans votre espace ambassadeur."),
      link: "/workspace/ambassadeurs",
    });
  }
}

export async function recordFlowAmbassadorFirstPaidInvoice(input: {
  workspaceId: string;
  invoiceId: string;
  amountPaid: number;
  currency: string;
  paidAt: string;
}): Promise<void> {
  if (!input.invoiceId || input.amountPaid <= 0) return;
  const admin = createAdminClient();
  const { data: referral } = await admin.from("flow_ambassador_referrals")
    .select("id")
    .eq("referred_workspace_id", input.workspaceId)
    .maybeSingle();
  if (!referral) return;
  const amount = Math.round(input.amountPaid * 100) / 100;
  const payableAt = new Date(new Date(input.paidAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: commission, error } = await admin.from("flow_ambassador_commissions").insert({
    referral_id: referral.id,
    stripe_invoice_id: input.invoiceId,
    base_amount: amount,
    commission_amount: Math.round(amount * 10) / 100,
    currency: input.currency.toLowerCase(),
    rate_percent: 10,
    paid_at_source: input.paidAt,
    payable_at: payableAt,
  }).select("id").maybeSingle();
  if (error || !commission) return;

  const { data: referralWithOwner } = await admin.from("flow_ambassador_referrals")
    .select("flow_ambassadors!inner(user_id)")
    .eq("id", referral.id)
    .maybeSingle();
  const ambassadorUserId = (referralWithOwner?.flow_ambassadors as unknown as { user_id: string } | null)?.user_id;
  if (ambassadorUserId) {
    await notifyFlowAmbassador(ambassadorUserId, {
      kind: "commission",
      commissionAmount: Math.round(amount * 10) / 100,
      currency: input.currency,
      payableAt,
    });
  }
}
