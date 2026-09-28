import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { getFlowAmbassadorSummary, getOrCreateFlowAmbassador, notifyFlowAmbassador } from "@/lib/data/flow-ambassadors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createExpressAccount, createOnboardingLink, retrieveAccountState } from "@/lib/stripe/connect";
import { getStripeClient } from "@/lib/stripe/config";
import { getAmbassadorPayoutBlockReason } from "@/lib/ambassadors/payout-gate";

const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

async function ambassadorDashboard(userId: string) {
  const summary = await getFlowAmbassadorSummary(userId);
  const admin = createAdminClient();
  const [{ data: ambassador }, { data: profiles }] = await Promise.all([
    admin.from("flow_ambassadors").select("id").eq("user_id", userId).maybeSingle(),
    admin.from("flow_ugc_restaurant_profiles").select("id, display_name, city, approved_quote").eq("is_active", true).order("display_name"),
  ]);
  const { data: submissionRows } = ambassador?.id
    ? await admin.from("flow_ugc_submissions").select("id, platform, post_url, caption, status, review_note, created_at, flow_ugc_restaurant_profiles!inner(display_name)")
        .eq("ambassador_id", ambassador.id).order("created_at", { ascending: false }).limit(20)
    : { data: [] };
  const submissions = ((submissionRows ?? []) as unknown as { id: string; platform: string; post_url: string; caption: string; status: string; review_note: string | null; created_at: string; flow_ugc_restaurant_profiles: { display_name: string } }[])
    .map((row) => ({ id: row.id, platform: row.platform, postUrl: row.post_url, caption: row.caption, status: row.status, reviewNote: row.review_note, createdAt: row.created_at, restaurantName: row.flow_ugc_restaurant_profiles.display_name }));
  let payoutsEnabled = false;
  if (summary?.stripeConnected) {
    const { data } = await createAdminClient().from("flow_ambassadors").select("stripe_account_id").eq("user_id", userId).maybeSingle();
    if (data?.stripe_account_id) {
      try { payoutsEnabled = (await retrieveAccountState(data.stripe_account_id)).payoutsEnabled; } catch { payoutsEnabled = false; }
    }
  }
  return {
    summary,
    payoutsEnabled,
    shareUrl: summary?.links[0] ? `${appOrigin}/r/${summary.links[0].slug}` : null,
    profiles: (profiles ?? []).map((row) => ({ id: row.id, name: row.display_name, city: row.city, quote: row.approved_quote })),
    submissions,
  };
}

export async function GET(request: Request) {
  const userId = await resolveNativeUserId(request);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await ambassadorDashboard(userId));
}

export async function POST(request: Request) {
  const userId = await resolveNativeUserId(request);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    action?: string; locale?: string; commissionId?: string; restaurantProfileId?: string;
    platform?: string; postUrl?: string; caption?: string; disclosureConfirmed?: boolean;
    usageRightsConfirmed?: boolean; referralLinkId?: string; label?: string; contentUrl?: string;
  } | null;
  const admin = createAdminClient();

  if (body?.action === "join") {
    const existed = await getFlowAmbassadorSummary(userId);
    const code = await getOrCreateFlowAmbassador(userId);
    if (!code) return NextResponse.json({ error: "Impossible de créer votre compte ambassadeur." }, { status: 500 });
    if (!existed) await notifyFlowAmbassador(userId, { kind: "welcome" });
    return NextResponse.json(await ambassadorDashboard(userId));
  }

  if (body?.action === "connectStripe") {
    const locale = ["fr", "en", "tr"].includes(body.locale ?? "") ? body.locale! : "fr";
    const { data: ambassador } = await admin.from("flow_ambassadors").select("id, stripe_account_id").eq("user_id", userId).maybeSingle();
    if (!ambassador) return NextResponse.json({ error: "Rejoignez d’abord le programme." }, { status: 409 });
    try {
      let accountId = ambassador.stripe_account_id as string | null;
      if (!accountId) {
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        accountId = await createExpressAccount(authUser.user?.email ?? null);
        const { error } = await admin.from("flow_ambassadors").update({ stripe_account_id: accountId }).eq("id", ambassador.id);
        if (error) throw error;
      }
      const base = `${appOrigin}/${locale}/workspace/ambassadeurs`;
      return NextResponse.json({ url: await createOnboardingLink(accountId, `${base}?stripe=refresh`, `${base}?stripe=return`) });
    } catch {
      return NextResponse.json({ error: "La configuration des versements est indisponible." }, { status: 503 });
    }
  }

  if (body?.action === "createLink") {
    const label = body.label?.trim().slice(0, 120) ?? "";
    const platforms = ["instagram", "tiktok", "youtube", "linkedin", "facebook", "other"];
    const platform = body.platform ?? "";
    const contentUrl = body.contentUrl?.trim() ?? "";
    if (label.length < 2 || !platforms.includes(platform) || (contentUrl && (!/^https:\/\//i.test(contentUrl) || contentUrl.length > 2048))) {
      return NextResponse.json({ error: "Vérifiez le nom, la plateforme et l’URL du contenu." }, { status: 400 });
    }
    const { data: ambassador } = await admin.from("flow_ambassadors").select("id").eq("user_id", userId).eq("status", "active").maybeSingle();
    if (!ambassador) return NextResponse.json({ error: "Rejoignez d’abord le programme." }, { status: 409 });
    const { error } = await admin.from("flow_ambassador_links").insert({
      ambassador_id: ambassador.id, slug: randomBytes(6).toString("hex"), label, platform, content_url: contentUrl || null,
    });
    if (error) return NextResponse.json({ error: "Impossible de créer ce lien." }, { status: 500 });
    return NextResponse.json(await ambassadorDashboard(userId));
  }

  if (body?.action === "submitUgc") {
    const platforms = ["instagram", "tiktok", "youtube", "linkedin", "facebook", "other"];
    const restaurantProfileId = body.restaurantProfileId ?? "";
    const platform = body.platform ?? "";
    const postUrl = body.postUrl?.trim() ?? "";
    const caption = body.caption?.trim() ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(restaurantProfileId) || !platforms.includes(platform)
      || !/^https:\/\//i.test(postUrl) || postUrl.length > 2048 || caption.length < 2 || caption.length > 2000
      || !caption.toLowerCase().includes("#minervaflow")
      || body.disclosureConfirmed !== true || body.usageRightsConfirmed !== true) {
      return NextResponse.json({ error: "Vérifiez le lien, le contenu et les confirmations requises." }, { status: 400 });
    }
    const { data: ambassador } = await admin.from("flow_ambassadors").select("id").eq("user_id", userId).maybeSingle();
    const { data: profile } = await admin.from("flow_ugc_restaurant_profiles").select("id").eq("id", restaurantProfileId).eq("is_active", true).maybeSingle();
    if (!ambassador || !profile) return NextResponse.json({ error: "Rejoignez le programme et choisissez un restaurant participant." }, { status: 409 });
    let referralLinkId: string | null = null;
    if (body.referralLinkId) {
      const { data: link } = await admin.from("flow_ambassador_links").select("id").eq("id", body.referralLinkId).eq("ambassador_id", ambassador.id).maybeSingle();
      if (!link) return NextResponse.json({ error: "Le lien associé n’appartient pas à cet espace ambassadeur." }, { status: 400 });
      referralLinkId = link.id as string;
    }
    const { error } = await admin.from("flow_ugc_submissions").insert({
      ambassador_id: ambassador.id, restaurant_profile_id: profile.id, platform, post_url: postUrl,
      caption: caption.slice(0, 2000), referral_link_id: referralLinkId, disclosure_confirmed: true, usage_rights_confirmed: true,
    });
    if (error) return NextResponse.json({ error: "Impossible d’envoyer le contenu pour vérification." }, { status: 500 });
    return NextResponse.json(await ambassadorDashboard(userId));
  }

  if (body?.action === "payout" && /^[0-9a-f-]{36}$/i.test(body.commissionId ?? "")) {
    const commissionId = body.commissionId!;
    const { data: ambassador } = await admin.from("flow_ambassadors").select("id, stripe_account_id").eq("user_id", userId).maybeSingle();
    if (!ambassador?.stripe_account_id) return NextResponse.json({ error: "Connectez votre compte de versement Stripe." }, { status: 409 });
    const { data: commission } = await admin.from("flow_ambassador_commissions")
      .select("id, referral_id, commission_amount, currency, payable_at, status, stripe_transfer_id, payout_approved_at, flow_ambassador_referrals!inner(ambassador_id)")
      .eq("id", commissionId).maybeSingle();
    const owner = (commission?.flow_ambassador_referrals as unknown as { ambassador_id: string } | null)?.ambassador_id;
    if (!commission || owner !== ambassador.id) return NextResponse.json({ error: "Commission introuvable." }, { status: 404 });
    if (commission.stripe_transfer_id) return NextResponse.json(await ambassadorDashboard(userId));
    try {
      const state = await retrieveAccountState(ambassador.stripe_account_id);
      const blockReason = getAmbassadorPayoutBlockReason({
        status: commission.status,
        payableAt: commission.payable_at,
        approvedAt: commission.payout_approved_at,
        transferId: commission.stripe_transfer_id,
        payoutsEnabled: state.payoutsEnabled,
      });
      if (blockReason === "approval_required") return NextResponse.json({ error: "Cette commission attend l’approbation de Minerva Flow." }, { status: 409 });
      if (blockReason === "not_mature") return NextResponse.json({ error: "Cette commission sera disponible après le délai de 30 jours." }, { status: 409 });
      if (blockReason === "account_incomplete") return NextResponse.json({ error: "Stripe doit encore vérifier votre compte de versement." }, { status: 409 });
      if (blockReason) return NextResponse.json({ error: "Cette commission ne peut pas être versée." }, { status: 409 });
      const transfer = await getStripeClient().transfers.create({
        amount: Math.round(Number(commission.commission_amount) * 100),
        currency: String(commission.currency).toLowerCase(),
        destination: ambassador.stripe_account_id,
        transfer_group: `ambassador_${commissionId}`,
        metadata: { flow_ambassador_commission_id: commissionId, ambassador_user_id: userId },
      }, { idempotencyKey: `flow-ambassador-payout-${commissionId}` });
      const { error } = await admin.from("flow_ambassador_commissions").update({
        status: "paid", stripe_transfer_id: transfer.id, payout_reference: transfer.id, settled_at: new Date().toISOString(),
      }).eq("id", commissionId).is("stripe_transfer_id", null);
      if (error) return NextResponse.json({ error: "Le transfert Stripe doit être réconcilié." }, { status: 503 });
      await notifyFlowAmbassador(userId, {
        kind: "payout",
        commissionAmount: Number(commission.commission_amount),
        currency: String(commission.currency),
        payoutReference: transfer.id,
      });
      return NextResponse.json(await ambassadorDashboard(userId));
    } catch {
      return NextResponse.json({ error: "Le versement Stripe a échoué. Réessayez." }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
