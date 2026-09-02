import "server-only";
import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils";
import type { Prospect } from "@/lib/prospects/types";
import { getDemoUrl } from "@/lib/prospects/demo-url";
import { estimateMargin } from "@/lib/prospects/margin";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Minerva Flow <flow@minervaflow.app>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "support@minervaflow.app";
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailLayout({
  title,
  preheader,
  contentHtml,
  ctaText,
  ctaUrl,
}: {
  title: string;
  preheader: string;
  contentHtml: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#F5F1E6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1A1E16;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1E6;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
            <tr>
              <td style="padding:0 8px 20px;">
                <span style="font-size:17px; font-weight:700; color:#1A1E16; letter-spacing:-0.01em;">Flow <span style="color:#059669;">par Minerva</span></span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#FAFAF5; border:1px solid #E6E0D0; border-radius:18px; padding:36px 36px 32px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                ${contentHtml}
                <div style="margin-top:32px; text-align:center;">
                  <a href="${ctaUrl}" style="display:inline-block; padding:14px 28px; background-color:#059669; color:#FAFAF5; text-decoration:none; border-radius:10px; font-size:14.5px; font-weight:600; box-shadow:0 2px 6px rgba(5,150,105,0.25);">
                    ${escapeHtml(ctaText)} →
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 8px 0; text-align:center;">
                <p style="margin:0 0 6px; font-size:12px; line-height:1.5; color:#8D9488;">
                  Minerva Studio &middot; Solutions digitales pour la restauration qu&eacute;b&eacute;coise
                </p>
                <p style="margin:0; font-size:11.5px; line-height:1.5; color:#A0A69B;">
                  Vous recevez ce diagnostic car votre &eacute;tablissement a &eacute;t&eacute; analys&eacute; pour optimisation de commande directe.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type SendAuditEmailParams = {
  to: string;
  prospect: Prospect;
  customMessage?: string;
};

export async function sendProspectAuditEmail({
  to,
  prospect,
  customMessage,
}: SendAuditEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "RESEND_API_KEY non configurée" };

  const demoUrl = prospect.demoSlug ? getDemoUrl(prospect.demoSlug) : APP_ORIGIN;
  const margin = estimateMargin(prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders);
  const monthlyLoss = formatCurrency(margin.monthlyLossCents / 100);
  const avgBasket = formatCurrency(margin.averageOrderValueCents / 100);
  const auditScore = prospect.auditReport?.score ?? 65;

  const contentHtml = `
    <div style="margin-bottom:16px;">
      <span style="display:inline-block; padding:4px 10px; background-color:#DCFCE7; color:#166534; font-size:11px; font-weight:700; text-transform:uppercase; border-radius:999px; letter-spacing:0.04em;">
        Diagnostic Digital &amp; Rentabilit&eacute;
      </span>
    </div>
    <h1 style="margin:0 0 16px; font-size:22px; font-weight:700; color:#1A1E16; line-height:1.3;">
      Optimisation des marges &amp; commande directe : ${escapeHtml(prospect.restaurantName)}
    </h1>
    <p style="margin:0 0 20px; font-size:14.5px; line-height:1.6; color:#4B5563;">
      Bonjour,<br /><br />
      Nous avons r&eacute;alis&eacute; une analyse de la pr&eacute;sence en ligne de <strong>${escapeHtml(prospect.restaurantName)}</strong> ainsi que de l'impact des commissions de livraison tierces sur votre rentabilit&eacute;.
    </p>

    <div style="background-color:#F0EDE0; border:1px solid #E2DCD0; border-radius:12px; padding:20px; margin-bottom:24px;">
      <h3 style="margin:0 0 12px; font-size:14px; font-weight:700; color:#1A1E16; text-transform:uppercase; letter-spacing:0.03em;">
        R&eacute;sum&eacute; de votre audit
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px; line-height:1.8;">
        <tr>
          <td style="color:#6B7280;">Score de performance web :</td>
          <td align="right" style="font-weight:700; color:${auditScore >= 70 ? "#059669" : "#DC2626"};">${auditScore}/100</td>
        </tr>
        <tr>
          <td style="color:#6B7280;">Taux de commission estim&eacute; :</td>
          <td align="right" style="font-weight:600; color:#1A1E16;">${prospect.commissionRatePct}%</td>
        </tr>
        <tr>
          <td style="color:#6B7280;">Panier moyen estim&eacute; :</td>
          <td align="right" style="font-weight:600; color:#1A1E16;">${avgBasket}</td>
        </tr>
        <tr style="border-top:1px solid #D6D0C2;">
          <td style="padding-top:8px; font-weight:600; color:#DC2626;">Commissions c&eacute;d&eacute;es estim&eacute;es / mois :</td>
          <td align="right" style="padding-top:8px; font-weight:700; color:#DC2626; font-size:15px;">~${monthlyLoss}</td>
        </tr>
      </table>
    </div>

    ${
      customMessage
        ? `<div style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#374151; padding:14px 16px; border-left:3px solid #059669; background:#F4F8F5; border-radius:0 8px 8px 0;">
            ${escapeHtml(customMessage)}
          </div>`
        : ""
    }

    <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#4B5563;">
      Nous avons cr&eacute;&eacute; une <strong>d&eacute;monstration interactive et sur mesure</strong> de votre propre menu sur <strong>Minerva Flow</strong>, permettant &agrave; vos clients de commander directement &agrave; 0% de commission.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Diagnostic & Démonstration interactive pour ${prospect.restaurantName}`,
      html: emailLayout({
        title: `Audit & Démo pour ${prospect.restaurantName}`,
        preheader: `Découvrez comment récupérer jusqu'à ${monthlyLoss}/mois sur vos commandes directes.`,
        contentHtml,
        ctaText: "Accéder à la démo interactive",
        ctaUrl: demoUrl,
      }),
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue lors de l'envoi de l'email";
    return { ok: false, error: message };
  }
}

export type SendRelanceEmailParams = {
  to: string;
  prospect: Prospect;
  step: 1 | 2;
  customMessage?: string;
};

export async function sendProspectRelanceEmail({
  to,
  prospect,
  step,
  customMessage,
}: SendRelanceEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: "RESEND_API_KEY non configurée" };

  const demoUrl = prospect.demoSlug ? getDemoUrl(prospect.demoSlug) : APP_ORIGIN;
  const margin = estimateMargin(prospect.menu, prospect.commissionRatePct, prospect.assumedMonthlyOrders);
  const monthlyLoss = formatCurrency(margin.monthlyLossCents / 100);

  let subject = "";
  let preheader = "";
  let badgeLabel = "";
  let contentHtml = "";

  if (step === 1) {
    // Relance 1 : Focus Rentabilité & Récupération des marges (J+2)
    badgeLabel = "Suivi Rentabilité & Marges";
    subject = `Re: Diagnostic pour ${prospect.restaurantName} — Économisez ~${monthlyLoss}/mois`;
    preheader = `Avez-vous eu l'occasion de consulter l'estimation des commissions pour ${prospect.restaurantName} ?`;

    contentHtml = `
      <div style="margin-bottom:16px;">
        <span style="display:inline-block; padding:4px 10px; background-color:#FEF3C7; color:#92400E; font-size:11px; font-weight:700; text-transform:uppercase; border-radius:999px; letter-spacing:0.04em;">
          ${badgeLabel}
        </span>
      </div>
      <h1 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#1A1E16; line-height:1.3;">
        Un rappel rapide concernant vos marges chez ${escapeHtml(prospect.restaurantName)}
      </h1>
      <p style="margin:0 0 16px; font-size:14.5px; line-height:1.6; color:#4B5563;">
        Bonjour,<br /><br />
        Je me permets de revenir vers vous suite &agrave; l'envoi de votre audit technique. En moyenne, un restaurant de votre cat&eacute;gorie c&egrave;de <strong>${prospect.commissionRatePct}%</strong> de chaque commande aux plateformes externes, repr&eacute;sentant pr&egrave;s de <strong>${monthlyLoss}</strong> chaque mois.
      </p>
      ${
        customMessage
          ? `<p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#374151; padding:12px 14px; background:#F8FAFC; border-left:3px solid #64748B; border-radius:0 6px 6px 0;">
              ${escapeHtml(customMessage)}
            </p>`
          : ""
      }
      <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#4B5563;">
        Avec Minerva Flow, vous disposez d'un portail de commande directe &agrave; votre image, sans interm&eacute;diaire ni commissions sur vos ventes.
      </p>
    `;
  } else {
    // Relance 2 : Focus Expérience client, Fidélisation & Clé en main (J+5)
    badgeLabel = "Dernière opportunité & Démo";
    subject = `Votre démo personnalisée expire bientôt — ${prospect.restaurantName}`;
    preheader = `La démo interactive configurée pour ${prospect.restaurantName} est toujours accessible.`;

    contentHtml = `
      <div style="margin-bottom:16px;">
        <span style="display:inline-block; padding:4px 10px; background-color:#EFF6FF; color:#1E40AF; font-size:11px; font-weight:700; text-transform:uppercase; border-radius:999px; letter-spacing:0.04em;">
          ${badgeLabel}
        </span>
      </div>
      <h1 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#1A1E16; line-height:1.3;">
        Votre d&eacute;monstration interactive pour ${escapeHtml(prospect.restaurantName)}
      </h1>
      <p style="margin:0 0 16px; font-size:14.5px; line-height:1.6; color:#4B5563;">
        Bonjour,<br /><br />
        Nous avons configur&eacute; votre catalogue complet, vos options et votre programme de fid&eacute;lisation client sur une d&eacute;mo op&eacute;rationnelle.
      </p>
      ${
        customMessage
          ? `<p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#374151; padding:12px 14px; background:#F8FAFC; border-left:3px solid #3B82F6; border-radius:0 6px 6px 0;">
              ${escapeHtml(customMessage)}
            </p>`
          : ""
      }
      <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#4B5563;">
        La mise en place prend moins de 48 heures et nos &eacute;quipes s'occupent de toute la migration technique de votre menu.
      </p>
    `;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: emailLayout({
        title: subject,
        preheader,
        contentHtml,
        ctaText: "Consulter la démo de votre restaurant",
        ctaUrl: demoUrl,
      }),
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'envoi de la relance";
    return { ok: false, error: message };
  }
}
