import { createClient } from "@/lib/supabase/server";
import {
  parseWorkspaceBrandingInput,
  type WorkspaceBranding,
  type WorkspaceBrandingInput,
} from "@/lib/branding/workspace-branding";

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
    .select("*")
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
      email_sender_name: parsed.emailSenderName,
      email_reply_to: parsed.emailReplyTo,
    })
    .eq("workspace_id", workspaceId)
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return mapWorkspaceBranding(data as WorkspaceBrandingRow);
}

export { mapWorkspaceBranding };
