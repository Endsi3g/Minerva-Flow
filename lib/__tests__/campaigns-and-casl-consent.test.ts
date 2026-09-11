import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PRIORITIZED_CAMPAIGN_TEMPLATES,
  POST_MVP_CAMPAIGNS,
  renderCampaignTemplate,
  dispatchCampaignToCustomer,
} from "@/lib/campaigns/templates";
import {
  SERVICE_CONSENT_TEXT,
  getMarketingConsentText,
  handleSmsInboundKeyword,
} from "@/lib/data/consent";

// Mock Supabase admin client for dispatch tests
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Mock SMS sending
vi.mock("@/lib/sms/send", () => ({
  sendSms: vi.fn().mockResolvedValue(true),
  isSmsConfigured: vi.fn().mockReturnValue(true),
}));

// Mock Email sending
vi.mock("@/lib/email/resend", () => ({
  sendRetentionEmail: vi.fn().mockResolvedValue({ id: "msg_mock" }),
}));

// Mock activity logger
vi.mock("@/lib/data/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe("Prioritized Campaign Templates & LCAP/CASL Compliance", () => {
  const restaurantName = "Café de la Paix";
  const customerName = "Sophie Bouchard";

  describe("1. Ready-to-Use Prioritized Campaign Templates", () => {
    it("renders 'welcome' template immediately after signup with exact core phrasing", () => {
      const rendered = renderCampaignTemplate("welcome", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("Bienvenue chez Café de la Paix");
      expect(rendered.smsBody).toContain(
        "Café de la Paix : Bienvenue Sophie ! Votre première récompense vous attend à votre prochaine visite."
      );
      expect(rendered.htmlBody).toContain("Café de la Paix");
      expect(rendered.htmlBody).toContain("Votre première récompense vous attend");
      expect(rendered.htmlBody).toContain("Minerva Technologies Inc. · Montréal (Québec), Canada");
      expect(rendered.htmlBody).toContain("Se désabonner des communications marketing");
    });

    it("renders 'second_visit' template sent days after 1st visit if not returned", () => {
      const rendered = renderCampaignTemplate("second_visit", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("il ne vous manque qu'une visite chez Café de la Paix");
      expect(rendered.smsBody).toContain(
        "Café de la Paix : Sophie, il ne vous manque qu’une visite pour débloquer votre prochaine récompense !"
      );
      expect(rendered.htmlBody).toContain("Il ne vous manque qu’une seule visite");
      expect(rendered.htmlBody).toContain("Découvrir mes récompenses");
    });

    it("renders 'reactivation_21d' template triggered after 21 days of absence", () => {
      const rendered = renderCampaignTemplate("reactivation_21d", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("offre réservée aux habitués");
      expect(rendered.smsBody).toContain(
        "Café de la Paix : Sophie, ça fait un moment qu'on ne vous a pas vu ! Revenez cette semaine et profitez de votre offre réservée aux habitués."
      );
      expect(rendered.htmlBody).toContain("Cela fait un moment qu’on ne vous a pas vu");
      expect(rendered.htmlBody).toContain("offre réservée aux habitués");
    });

    it("renders 'off_peak' template targeted for specific segment and time slot", () => {
      const rendered = renderCampaignTemplate("off_peak", {
        restaurantName,
        customerName,
        timeSlot: "Mardi midi",
        offerText: "un dessert maison offert",
      });

      expect(rendered.subject).toContain("Mardi midi calme chez Café de la Paix");
      expect(rendered.smsBody).toContain("Mardi midi est plus calme que d'habitude");
      expect(rendered.htmlBody).toContain("Mardi midi est plus calme que d’habitude chez Café de la Paix");
      expect(rendered.htmlBody).toContain("un dessert maison offert");
    });

    it("renders 'reward_available' template when reward is unlocked", () => {
      const rendered = renderCampaignTemplate("reward_available", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("Votre récompense vous attend");
      expect(rendered.smsBody).toContain("votre récompense vous attend au comptoir !");
      expect(rendered.htmlBody).toContain("Votre récompense est prête");
    });

    it("renders 'vip_upgrade' template celebrating milestone tier upgrade", () => {
      const rendered = renderCampaignTemplate("vip_upgrade", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("statut Privilégié");
      expect(rendered.smsBody).toContain("Vous accédez au statut Privilégié");
      expect(rendered.htmlBody).toContain("statut Privilégié");
    });

    it("renders 'referral_share' template inviting loyal customers to share", () => {
      const rendered = renderCampaignTemplate("referral_share", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("Invitez un ami");
      expect(rendered.smsBody).toContain("Invitez un proche");
      expect(rendered.htmlBody).toContain("Partager mon lien de parrainage");
    });

    it("renders 'winback_60d' template re-engaging customers after 60 days", () => {
      const rendered = renderCampaignTemplate("winback_60d", {
        restaurantName,
        customerName,
      });

      expect(rendered.subject).toContain("vous nous manquez");
      expect(rendered.smsBody).toContain("vous nous manquez !");
      expect(rendered.htmlBody).toContain("Cela fait 60 jours");
    });

    it("confirms Birthday campaign is explicitly deferred post-MVP with privacy rationale", () => {
      expect(POST_MVP_CAMPAIGNS.birthday.status).toBe("post_mvp");
      expect(POST_MVP_CAMPAIGNS.birthday.reason).toContain("donnée personnelle supplémentaire");
    });
  });

  describe("2. Canadian CASL / LCAP Dual Consent Formulas", () => {
    it("provides the required, unbundled Service consent formulation", () => {
      expect(SERVICE_CONSENT_TEXT).toBe(
        "J’accepte de recevoir les communications nécessaires à l’utilisation de mon compte Minerva Flow."
      );
    });

    it("provides the clear Marketing consent formulation with restaurant interpolation", () => {
      const text = getMarketingConsentText("Bistro Saint-Henri");
      expect(text).toBe(
        "J’accepte de recevoir des offres et communications marketing de la part de Bistro Saint-Henri par SMS et courriel. Je peux me désabonner à tout moment."
      );
    });
  });

  describe("3. Inbound SMS Unsubscribe Keyword Handling (STOP / ARRÊT)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("identifies standard English STOP keywords", async () => {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

      const result = await handleSmsInboundKeyword("+15145550199", "STOP");
      expect(result.action).toBe("opt_out");
    });

    it("identifies Canadian French ARRÊT and ARRET keywords", async () => {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

      const resArret = await handleSmsInboundKeyword("+15145550199", "ARRÊT");
      expect(resArret.action).toBe("opt_out");

      const resArretPlain = await handleSmsInboundKeyword("+15145550199", "arret");
      expect(resArretPlain.action).toBe("opt_out");
    });

    it("ignores non-opt-out conversational messages", async () => {
      const result = await handleSmsInboundKeyword("+15145550199", "Bonjour, quelle est l'adresse ?");
      expect(result.action).toBe("unknown");
    });
  });

  describe("4. Strict CASL Marketing Blocking", () => {
    it("blocks marketing campaign send when customer has not consented (marketing_consent: false)", async () => {
      const { createAdminClient } = await import("@/lib/supabase/admin");

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "restaurants") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "rest_1",
                      name: "Bistro Minerva",
                      campaign_welcome_enabled: true,
                    },
                  }),
                }),
              }),
            };
          }
          if (table === "customers") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "cust_1",
                        name: "Jean Tremblay",
                        email: "jean@example.com",
                        phone: "+15145550123",
                        marketing_consent: false, // NO CONSENT
                      },
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any);

      const result = await dispatchCampaignToCustomer({
        restaurantId: "rest_1",
        customerId: "cust_1",
        templateId: "welcome",
      });

      expect(result.success).toBe(false);
      expect(result.caslBlocked).toBe(true);
      expect(result.error).toContain("consentement marketing explicite (LCAP / CASL)");
    });
  });
});
