import { describe, it, expect } from "vitest";
import type {
  PlatformAnnouncement,
  PlatformSurveyResponse,
  EcosystemAppProposal,
  EcosystemProposalStatus,
} from "@/lib/types";

describe("Platform Announcements & Ecosystem Proposals", () => {
  it("validates PlatformAnnouncement shape and optional poll attributes", () => {
    const announcement: PlatformAnnouncement = {
      id: "ann-001",
      title: "Nouvelles fonctionnalités",
      body: "Découvrez notre nouveau programme",
      badgeLabel: "NOUVEAUTÉ",
      category: "engagement",
      callToActionLabel: "Voir plus",
      callToActionUrl: "https://minervaflow.app",
      pollQuestion: "Seriez-vous intéressés par de nouvelles fonctionnalités ?",
      pollOptions: ["Oui, absolument !", "Peut-être", "Non, ça va"],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    expect(announcement.id).toBe("ann-001");
    expect(announcement.pollOptions).toHaveLength(3);
    expect(announcement.pollQuestion).toContain("Seriez-vous intéressés");
  });

  it("validates PlatformSurveyResponse payload", () => {
    const response: PlatformSurveyResponse = {
      id: "resp-001",
      announcementId: "ann-001",
      customerId: "cust-123",
      selectedOption: "Oui, absolument !",
      feedbackText: "J'aimerais des réservations en ligne",
      platform: "ios",
      createdAt: new Date().toISOString(),
    };

    expect(response.selectedOption).toBe("Oui, absolument !");
    expect(response.platform).toBe("ios");
  });

  it("validates EcosystemAppProposal statuses and structure", () => {
    const statuses: EcosystemProposalStatus[] = [
      "submitted",
      "under_review",
      "planned",
      "declined",
    ];

    expect(statuses).toContain("submitted");
    expect(statuses).toContain("under_review");
    expect(statuses).toContain("planned");

    const proposal: EcosystemAppProposal = {
      id: "prop-001",
      userId: "user-123",
      appName: "Minerva Staff Schedule",
      category: "hr",
      description: "Gestion des plannings et disponibilités d'équipe",
      status: "submitted",
      createdAt: new Date().toISOString(),
    };

    expect(proposal.appName).toBe("Minerva Staff Schedule");
    expect(proposal.category).toBe("hr");
    expect(proposal.status).toBe("submitted");
  });
});
