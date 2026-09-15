import type { CSSProperties } from "react";
import { z } from "zod";

export const BRAND_HEADING_FONTS = ["new_york", "playfair_display", "system_serif"] as const;
export const BRAND_BODY_FONTS = ["plus_jakarta_sans", "inter", "system_sans"] as const;
export const BRAND_LOCALES = ["fr-CA", "fr-FR", "en-CA", "en-US"] as const;
export const BRAND_AI_TONES = ["professionnel", "chaleureux", "direct", "luxe"] as const;

export type BrandHeadingFont = (typeof BRAND_HEADING_FONTS)[number];
export type BrandBodyFont = (typeof BRAND_BODY_FONTS)[number];
export type BrandLocale = (typeof BRAND_LOCALES)[number];
export type BrandAiTone = (typeof BRAND_AI_TONES)[number];
export type CustomDomainStatus = "non_configure" | "en_attente" | "verifie" | "erreur";

/**
 * Serializable, non-secret branding configuration. Provider credentials never
 * belong here: they are scoped and encrypted in their respective integrations.
 */
export type WorkspaceBranding = {
  workspaceId: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: BrandHeadingFont;
  bodyFont: BrandBodyFont;
  preferredLocale: BrandLocale;
  aiTone: BrandAiTone;
  enabledModules: Record<string, boolean>;
  enabledIntegrations: string[];
  requestedCustomDomain: string | null;
  customDomainStatus: CustomDomainStatus;
  emailSenderName: string | null;
  emailReplyTo: string | null;
  createdAt: string;
  updatedAt: string;
};

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const workspaceBrandingInputSchema = z.object({
  brandName: z.string().trim().min(2).max(100),
  logoUrl: z.union([z.url().max(2_048), z.literal("")]).transform((value) => value || null),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  headingFont: z.enum(BRAND_HEADING_FONTS),
  bodyFont: z.enum(BRAND_BODY_FONTS),
  preferredLocale: z.enum(BRAND_LOCALES),
  aiTone: z.enum(BRAND_AI_TONES),
  requestedCustomDomain: z.string().max(253),
  emailSenderName: z.string().trim().max(100),
  emailReplyTo: z.union([z.email().max(254), z.literal("")]),
});

export type WorkspaceBrandingInput = z.input<typeof workspaceBrandingInputSchema>;

export function parseWorkspaceBrandingInput(input: WorkspaceBrandingInput) {
  const parsed = workspaceBrandingInputSchema.parse(input);
  const requestedCustomDomain = normalizeRequestedDomain(parsed.requestedCustomDomain);
  if (parsed.requestedCustomDomain.trim() && !requestedCustomDomain) {
    throw new Error("Le domaine personnalisé est invalide.");
  }

  return {
    ...parsed,
    requestedCustomDomain,
    emailSenderName: parsed.emailSenderName || null,
    emailReplyTo: parsed.emailReplyTo || null,
  };
}

export const MINERVA_FLOW_ATTRIBUTION = "Propulsé par Minerva Flow";

const headingFontFamilies: Record<BrandHeadingFont, string> = {
  new_york: '"New York", -apple-system-serif, ui-serif, Georgia, serif',
  playfair_display: 'var(--font-heading-fallback), "Times New Roman", serif',
  system_serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
};

const bodyFontFamilies: Record<BrandBodyFont, string> = {
  plus_jakarta_sans: 'var(--font-jakarta), var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  inter: 'Inter, var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  system_sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

/** CSS variables are bounded to vetted values; user text is never interpolated into CSS. */
export function brandingCssVariables(branding: WorkspaceBranding | null): CSSProperties {
  if (!branding) return {};

  return {
    "--mv-green": branding.primaryColor,
    "--mv-green-dark": branding.secondaryColor,
    "--mv-lime": branding.accentColor,
    "--mv-body-font": bodyFontFamilies[branding.bodyFont],
    "--mv-heading-font": headingFontFamilies[branding.headingFont],
  } as CSSProperties;
}

export function normalizeRequestedDomain(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!normalized) return null;
  const domainPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  return domainPattern.test(normalized) ? normalized : null;
}
