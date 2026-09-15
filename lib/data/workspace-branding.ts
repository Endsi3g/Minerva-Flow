import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseWorkspaceBrandingInput,
  type WorkspaceBranding,
  type WorkspaceBrandingInput,
} from "@/lib/branding/workspace-branding";
import { randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

type WorkspaceBrandingRow = {
  workspace_id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: WorkspaceBranding["headingFont"];
  body_font: WorkspaceBranding["bodyFont"];
  preferred_locale: WorkspaceBranding["preferredLocale"];
  ai_tone: WorkspaceBranding["aiTone"];
  enabled_modules: Record<string, boolean> | null;
  enabled_integrations: string[] | null;
  requested_custom_domain: string | null;
  custom_domain_status: WorkspaceBranding["customDomainStatus"];
  email_sender_name: string | null;
  email_reply_to: string | null;
  created_at: string;
  updated_at: string;
};

const brandingSelect =
  "workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color, heading_font, body_font, preferred_locale, ai_tone, enabled_modules, enabled_integrations, requested_custom_domain, custom_domain_status, email_sender_name, email_reply_to, created_at, updated_at";

function mapWorkspaceBranding(row: WorkspaceBrandingRow): WorkspaceBranding {
  return {
    workspaceId: row.workspace_id,
    brandName: row.brand_name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    headingFont: row.heading_font,
    bodyFont: row.body_font,
    preferredLocale: row.preferred_locale,
    aiTone: row.ai_tone,
    enabledModules: row.enabled_modules ?? {},
    enabledIntegrations: row.enabled_integrations ?? [],
    requestedCustomDomain: row.requested_custom_domain,
    customDomainStatus: row.custom_domain_status,
    emailSenderName: row.email_sender_name,
    emailReplyTo: row.email_reply_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Returns null for a standalone restaurant or an inaccessible workspace. */
export async function getWorkspaceBranding(workspaceId: string | null | undefined): Promise<WorkspaceBranding | null> {
  if (!workspaceId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_brand_settings")
    .select(brandingSelect)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return mapWorkspaceBranding(data as WorkspaceBrandingRow);
}

/**
 * Persist an owner-approved white-label configuration. Domain verification is
 * never accepted from the browser: changing a hostname puts it back into the
 * pending state until the server-side DNS verifier confirms ownership.
 */
export async function updateWorkspaceBranding(
  workspaceId: string,
  input: WorkspaceBrandingInput
): Promise<WorkspaceBranding | null> {
  const parsed = parseWorkspaceBrandingInput(input);
  const current = await getWorkspaceBranding(workspaceId);
  if (!current) return null;

  const domainChanged = parsed.requestedCustomDomain !== current.requestedCustomDomain;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_brand_settings")
    .update({
      brand_name: parsed.brandName,
      logo_url: parsed.logoUrl,
      primary_color: parsed.primaryColor,
      secondary_color: parsed.secondaryColor,
      accent_color: parsed.accentColor,
      heading_font: parsed.headingFont,
      body_font: parsed.bodyFont,
      preferred_locale: parsed.preferredLocale,
      ai_tone: parsed.aiTone,
      requested_custom_domain: parsed.requestedCustomDomain,
      custom_domain_status: domainChanged
        ? parsed.requestedCustomDomain
          ? "en_attente"
          : "non_configure"
        : current.customDomainStatus,
      ...(domainChanged ? { custom_domain_verification_token: randomUUID().replaceAll("-", "") } : {}),
      email_sender_name: parsed.emailSenderName,
      email_reply_to: parsed.emailReplyTo,
    })
    .eq("workspace_id", workspaceId)
    .select(brandingSelect)
    .maybeSingle();

  if (error || !data) return null;
  return mapWorkspaceBranding(data as WorkspaceBrandingRow);
}

export type WorkspaceDomainVerification = {
  domain: string | null;
  status: WorkspaceBranding["customDomainStatus"];
  token: string;
};

/** The DNS token is used only in the owner workspace setup UI. */
export async function getWorkspaceDomainVerification(workspaceId: string): Promise<WorkspaceDomainVerification | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_brand_settings")
    .select("requested_custom_domain, custom_domain_status, custom_domain_verification_token")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as {
    requested_custom_domain: string | null;
    custom_domain_status: WorkspaceBranding["customDomainStatus"];
    custom_domain_verification_token: string;
  };
  return { domain: row.requested_custom_domain, status: row.custom_domain_status, token: row.custom_domain_verification_token };
}

/**
 * Checks the TXT record on the requested host. DNS propagation can take time;
 * a failed check records an actionable error without activating the domain.
 */
export async function verifyWorkspaceCustomDomain(workspaceId: string): Promise<boolean> {
  const verification = await getWorkspaceDomainVerification(workspaceId);
  if (!verification?.domain) return false;

  const expected = `minerva-flow-verification=${verification.token}`;
  let verified = false;
  try {
    const records = await resolveTxt(verification.domain);
    verified = records.some((chunks) => chunks.join("") === expected);
  } catch {
    verified = false;
  }

  // The database trigger accepts the 'verifie' transition only from the
  // service role. Authorization is still checked in the server action before
  // this helper is called; the admin client prevents a browser from faking it.
  const admin = createAdminClient();
  const { error } = await admin
    .from("workspace_brand_settings")
    .update({ custom_domain_status: verified ? "verifie" : "erreur" })
    .eq("workspace_id", workspaceId);
  return !error && verified;
}

export { mapWorkspaceBranding };

export type PublicWorkspaceBranding = Pick<
  WorkspaceBranding,
  | "brandName"
  | "logoUrl"
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "headingFont"
  | "bodyFont"
  | "preferredLocale"
>;

/**
 * Public, cacheable identity lookup for a verified custom domain. It exposes
 * no workspace ID, user data, sender data, feature flags or integrations.
 */
export async function getPublicWorkspaceBrandingByDomain(domain: string): Promise<PublicWorkspaceBranding | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("workspace_brand_settings")
      .select("brand_name, logo_url, primary_color, secondary_color, accent_color, heading_font, body_font, preferred_locale")
      .eq("requested_custom_domain", domain)
      .eq("custom_domain_status", "verifie")
      .maybeSingle();

    if (error || !data) return null;
    const row = data as Pick<
      WorkspaceBrandingRow,
      | "brand_name"
      | "logo_url"
      | "primary_color"
      | "secondary_color"
      | "accent_color"
      | "heading_font"
      | "body_font"
      | "preferred_locale"
    >;
    return {
      brandName: row.brand_name,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      accentColor: row.accent_color,
      headingFont: row.heading_font,
      bodyFont: row.body_font,
      preferredLocale: row.preferred_locale,
    };
  } catch {
    return null;
  }
}
