"use server";

import { createAdminClient } from "@/lib/supabase/admin";

import * as Sentry from "@sentry/nextjs";
import { notifyCriticalError } from "@/lib/alerts/error-notifier";
import { syncProductUpdatesContact } from "@/lib/email/product-updates";

export type SignUpActionResult =
  | { success: true; userId: string }
  | { success: false; error: "ALREADY_REGISTERED" | "GENERIC"; message?: string };

export async function signUpAction(params: {
  email: string;
  password: string;
  referralCode?: string | null;
  ambassadorCode?: string | null;
  ambassadorLinkSlug?: string | null;
  inviteToken?: string | null;
  workspaceInviteToken?: string | null;
  productUpdatesOptIn?: boolean;
  preferredLanguage?: string;
}): Promise<SignUpActionResult> {
  try {
    const email = params.email?.trim().toLowerCase();
    const password = params.password;

    if (!email || !password) {
      return { success: false, error: "GENERIC", message: "Courriel et mot de passe requis." };
    }

    const signUpMetadata: Record<string, string> = {};
    signUpMetadata.product_updates_opt_in = params.productUpdatesOptIn === true ? "true" : "false";
    signUpMetadata.preferred_language = ["fr", "en", "tr"].includes(params.preferredLanguage ?? "")
      ? params.preferredLanguage!
      : "fr";
    if (params.referralCode) signUpMetadata.referral_code = params.referralCode;
    if (params.inviteToken) signUpMetadata.invite_token = params.inviteToken;
    if (params.workspaceInviteToken) signUpMetadata.workspace_invite_token = params.workspaceInviteToken;

    const admin = createAdminClient();

    const ambassadorCode = params.ambassadorCode?.trim().toUpperCase().slice(0, 24);
    if (ambassadorCode && !params.inviteToken && !params.workspaceInviteToken) {
      const { data: ambassador } = await admin.from("flow_ambassadors")
        .select("id, code")
        .eq("code", ambassadorCode)
        .eq("status", "active")
        .maybeSingle();
      if (ambassador) {
        signUpMetadata.flow_ambassador_code = ambassador.code as string;
        const slug = params.ambassadorLinkSlug?.trim().slice(0, 32);
        if (slug && /^[a-f0-9]{12}$/i.test(slug)) {
          const { data: link } = await admin.from("flow_ambassador_links").select("slug")
            .eq("slug", slug).eq("ambassador_id", ambassador.id).maybeSingle();
          if (link?.slug) signUpMetadata.flow_ambassador_link_slug = link.slug as string;
        }
      }
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: Object.keys(signUpMetadata).length > 0 ? signUpMetadata : undefined,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user with this email") ||
        error.status === 422
      ) {
        return { success: false, error: "ALREADY_REGISTERED" };
      }

      // Si c'est une erreur 500 ou problème d'infrastructure Supabase, alerter immédiatement
      if (error.status && error.status >= 500) {
        Sentry.captureException(error);
        void notifyCriticalError({
          error,
          source: "server_action",
          context: "Supabase Auth createUser failure (status >= 500)",
          userEmail: email,
        });
      }

      return { success: false, error: "GENERIC", message: error.message };
    }

    if (!data.user) {
      return { success: false, error: "GENERIC", message: "Impossible d'initialiser le compte utilisateur." };
    }

    if (params.productUpdatesOptIn === true && data.user.email) {
      await syncProductUpdatesContact({
        email: data.user.email,
        fullName: String(data.user.user_metadata?.full_name ?? ""),
        optedIn: true,
        preferredLanguage: signUpMetadata.preferred_language,
      }).catch((syncError) => {
        Sentry.captureException(syncError);
      });
    }

    return { success: true, userId: data.user.id };
  } catch (err: unknown) {
    // Interception défensive absolue contre tout crash serveur inattendu
    Sentry.captureException(err);
    void notifyCriticalError({
      error: err,
      source: "server_action",
      context: "signUpAction unhandled exception",
      userEmail: params.email?.trim().toLowerCase(),
    });

    return {
      success: false,
      error: "GENERIC",
      message: "Un problème technique temporaire est survenu lors de la création de compte. Veuillez réessayer.",
    };
  }
}

export type CheckAuthMethodResult = {
  isOAuth: boolean;
  provider?: string;
};

export async function checkEmailAuthMethodAction(email: string): Promise<CheckAuthMethodResult> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return { isOAuth: false };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error || !data?.users) return { isOAuth: false };

    const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (user) {
      const providers: string[] =
        user.app_metadata?.providers ?? (user.app_metadata?.provider ? [user.app_metadata.provider] : []);
      const hasPassword = providers.includes("email");
      const hasGoogle = providers.includes("google");
      const hasApple = providers.includes("apple");

      if (!hasPassword && (hasGoogle || hasApple)) {
        return { isOAuth: true, provider: hasGoogle ? "google" : "apple" };
      }
    }
  } catch (err) {
    // Log sans casser la navigation utilisateur
    console.warn("Avis: Échec de la vérification de méthode OAuth:", err);
  }

  return { isOAuth: false };
}
