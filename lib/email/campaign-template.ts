import { renderMinervaEmail } from "@/lib/email/brand-shell";

/** Shared wrapper for promotional broadcasts, including the Resend opt-out tag. */
export function renderCampaignAnnouncementEmail(input: {
  title: string;
  eyebrow: string;
  preheader: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return renderMinervaEmail({
    ...input,
    emailKind: "marketing",
    consentReason: "Vous recevez ce message parce que vous avez accepté les communications de Minerva Flow.",
  });
}
