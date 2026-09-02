import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  renderLifecycleEmail,
  type LifecycleStep,
  type LifecycleTemplateParams,
} from "@/lib/email/lifecycle-templates";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Minerva Flow <flow@minervaflow.app>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "support@minervaflow.app";
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app";

/**
 * Envoie un email spécifique de la séquence lifecycle à un utilisateur
 * et enregistre l'envoi dans `user_lifecycle_emails` pour garantir l'idempotence (1 seul envoi par étape).
 */
export async function sendLifecycleEmail({
  userId,
  email,
  step,
  params,
}: {
  userId: string;
  email: string;
  step: LifecycleStep;
  params?: Partial<LifecycleTemplateParams>;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY non configurée" };
  }

  const admin = createAdminClient();

  // 1. Vérifier si cette étape a déjà été envoyée à cet utilisateur
  const { data: existing } = await admin
    .from("user_lifecycle_emails")
    .select("id, status")
    .eq("user_id", userId)
    .eq("step", step)
    .maybeSingle();

  if (existing) {
    return { ok: true, skipped: true };
  }

  // 2. Rendu du template
  const templateParams: LifecycleTemplateParams = {
    appUrl: APP_ORIGIN,
    firstName: params?.firstName ?? null,
    restaurantName: params?.restaurantName ?? null,
    hasRestaurant: params?.hasRestaurant ?? false,
    hasServiceDays: params?.hasServiceDays ?? false,
    hasPosConnected: params?.hasPosConnected ?? false,
  };

  const rendered = renderLifecycleEmail(step, templateParams);

  // 3. Envoi via Resend
  const { data: sendResult, error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (sendError) {
    console.error(`[Lifecycle] Erreur envoi étape '${step}' à ${email}:`, sendError);
    return { ok: false, error: sendError.message };
  }

  // 4. Enregistrement en base de données pour idempotence
  await admin.from("user_lifecycle_emails").insert({
    user_id: userId,
    email,
    step,
    status: "sent",
    metadata: {
      resend_id: sendResult?.id,
      sent_at: new Date().toISOString(),
    },
  });

  return { ok: true };
}

/**
 * Moteur d'évaluation périodique (appelé par la route cron quotidienne)
 * Parcourt les utilisateurs inscrits, analyse leur progression et déclenche l'étape appropriée.
 */
export async function processLifecycleEngine(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const admin = createAdminClient();
  let sentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Récupérer les profils avec leur date de création
  const { data: profiles, error: profError } = await admin
    .from("profiles")
    .select("id, email, full_name, created_at, onboarding_completed")
    .not("email", "is", null);

  if (profError || !profiles) {
    console.error("[LifecycleEngine] Erreur lecture profils:", profError);
    return { processed: 0, sent: 0, skipped: 0, errors: 1 };
  }

  const now = Date.now();

  for (const profile of profiles) {
    if (!profile.email) continue;

    const createdAt = new Date(profile.created_at).getTime();
    const daysSinceSignup = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const hoursSinceSignup = Math.floor((now - createdAt) / (1000 * 60 * 60));

    // Récupérer les étapes déjà reçues par cet utilisateur
    const { data: sentSteps } = await admin
      .from("user_lifecycle_emails")
      .select("step, sent_at")
      .eq("user_id", profile.id);

    const receivedSteps = new Set((sentSteps ?? []).map((s) => s.step));

    // Récupérer le restaurant principal de l'utilisateur s'il existe
    const { data: membership } = await admin
      .from("restaurant_members")
      .select("restaurant_id, restaurants(name)")
      .eq("user_id", profile.id)
      .maybeSingle();

    const restaurantId = membership?.restaurant_id;
    const restaurantName = (membership?.restaurants as unknown as { name?: string } | null)?.name ?? null;

    // Vérifier si l'utilisateur a déjà saisi au moins une journée de service
    let hasServiceDays = false;
    if (restaurantId) {
      const { count } = await admin
        .from("service_days")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);
      hasServiceDays = (count ?? 0) > 0;
    }

    const firstName = profile.full_name?.split(" ")[0] ?? null;

    let targetStep: LifecycleStep | null = null;

    // Règle 1 : Immédiatement (Welcome)
    if (!receivedSteps.has("welcome")) {
      targetStep = "welcome";
    }
    // Règle 2 : J+1 (24h+) -> Activation
    else if (hoursSinceSignup >= 24 && !receivedSteps.has("activation")) {
      targetStep = "activation";
    }
    // Règle 3 : J+3 (72h+) -> Démonstration Fonction Clé
    else if (daysSinceSignup >= 3 && !receivedSteps.has("feature_highlight")) {
      targetStep = "feature_highlight";
    }
    // Règle 4 : J+5 (120h+) -> Support & Check-in
    else if (daysSinceSignup >= 5 && !receivedSteps.has("support_checkin")) {
      targetStep = "support_checkin";
    }
    // Règle 5 : J+7 (168h+) -> Cas d'usage & Rentabilité
    else if (daysSinceSignup >= 7 && !receivedSteps.has("case_study")) {
      targetStep = "case_study";
    }
    // Règle 6 : J+10 à J+14 -> Conversion Flow Pro
    else if (daysSinceSignup >= 10 && !receivedSteps.has("conversion")) {
      targetStep = "conversion";
    }
    // Règle 7 : Inactivité (J+18+ sans nouvelle étape envoyée depuis 7 jours)
    else if (daysSinceSignup >= 18 && !receivedSteps.has("reactivation")) {
      const lastSent = (sentSteps ?? []).sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      )[0];
      const daysSinceLastEmail = lastSent
        ? Math.floor((now - new Date(lastSent.sent_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastEmail >= 7) {
        targetStep = "reactivation";
      }
    }

    if (targetStep) {
      const res = await sendLifecycleEmail({
        userId: profile.id,
        email: profile.email,
        step: targetStep,
        params: {
          firstName,
          restaurantName,
          hasRestaurant: Boolean(restaurantId),
          hasServiceDays,
        },
      });

      if (res.ok) {
        if (res.skipped) skippedCount++;
        else sentCount++;
      } else {
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  return {
    processed: profiles.length,
    sent: sentCount,
    skipped: skippedCount,
    errors: errorCount,
  };
}
