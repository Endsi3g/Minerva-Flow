"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type SignUpActionResult =
  | { success: true; userId: string }
  | { success: false; error: "ALREADY_REGISTERED" | "GENERIC"; message?: string };

export async function signUpAction(params: {
  email: string;
  password: string;
  referralCode?: string | null;
  inviteToken?: string | null;
  workspaceInviteToken?: string | null;
}): Promise<SignUpActionResult> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (!email || !password) {
    return { success: false, error: "GENERIC", message: "Courriel et mot de passe requis." };
  }

  const signUpMetadata: Record<string, string> = {};
  if (params.referralCode) signUpMetadata.referral_code = params.referralCode;
  if (params.inviteToken) signUpMetadata.invite_token = params.inviteToken;
  if (params.workspaceInviteToken) signUpMetadata.workspace_invite_token = params.workspaceInviteToken;

  const admin = createAdminClient();

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
    return { success: false, error: "GENERIC", message: error.message };
  }

  if (!data.user) {
    return { success: false, error: "GENERIC" };
  }

  return { success: true, userId: data.user.id };
}

export type CheckAuthMethodResult = {
  isOAuth: boolean;
  provider?: string;
};

export async function checkEmailAuthMethodAction(email: string): Promise<CheckAuthMethodResult> {
  const normalized = email.trim().toLowerCase();
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
    console.error("Error checking auth method:", err);
  }

  return { isOAuth: false };
}
