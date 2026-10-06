import { describe, expect, it } from "vitest";
import { renderCampaignAnnouncementEmail } from "@/lib/email/campaign-template";

describe("renderCampaignAnnouncementEmail", () => {
  it("uses the shared Minerva release-email layout and unsubscribe footer", () => {
    const html = renderCampaignAnnouncementEmail({
      title: "Des recommandations plus claires",
      eyebrow: "Amélioration",
      preheader: "Des conseils plus faciles à comprendre.",
      bodyHtml: "<p style=\"margin:0\">Une amélioration utile.</p>",
      ctaLabel: "Voir les nouveautés",
      ctaUrl: "https://www.minervaflow.app/fr/changelog",
    });

    expect(html).toContain("https://minervaflow.app/icon-192.png");
    expect(html).toContain("background-color:#f5f1e6");
    expect(html).toContain("background-color:#fffefa");
    expect(html).toContain("font-family:'New York','-apple-system-serif','Playfair Display',Georgia,serif");
    expect(html).toContain("background-color:#167f5b");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("367 rue Laberge, Repentigny (Québec) J6A 4C2");
    expect(html).not.toContain("border-radius:16px");
  });

  it("escapes user-controlled title, preheader, and CTA attributes", () => {
    const html = renderCampaignAnnouncementEmail({
      title: "<script>alert('x')</script>",
      eyebrow: "Correctif",
      preheader: "<b>à lire</b>",
      bodyHtml: "<p>Texte maîtrisé</p>",
      ctaLabel: "Voir & lire",
      ctaUrl: 'https://example.com/?q="test"&x=1',
    });

    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;à lire&lt;/b&gt;");
    expect(html).toContain('href="https://example.com/?q=&quot;test&quot;&amp;x=1"');
    expect(html).toContain("Voir &amp; lire");
    expect(html).not.toContain("<script>");
  });
});
