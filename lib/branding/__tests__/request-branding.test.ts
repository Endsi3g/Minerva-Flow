import { describe, expect, it } from "vitest";
import { brandingForRequestHost, normalizeRequestHost } from "@/lib/branding/request-branding";
import type { WorkspaceBranding } from "@/lib/branding/workspace-branding";

const brand: WorkspaceBranding = {
  workspaceId: "workspace-a",
  brandName: "Café du Coin",
  logoUrl: null,
  primaryColor: "#123456",
  secondaryColor: "#123456",
  accentColor: "#ABCDEF",
  headingFont: "new_york",
  bodyFont: "plus_jakarta_sans",
  preferredLocale: "fr-CA",
  aiTone: "professionnel",
  enabledModules: {},
  enabledIntegrations: [],
  requestedCustomDomain: "app.cafe-du-coin.ca",
  customDomainStatus: "verifie",
  emailSenderName: null,
  emailReplyTo: null,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
};

describe("custom-domain request branding", () => {
  it("normalizes forwarded hosts safely", () => {
    expect(normalizeRequestHost("www.App.Cafe-Du-Coin.ca:443, proxy.internal")).toBe("app.cafe-du-coin.ca");
    expect(normalizeRequestHost("localhost:3200")).toBeNull();
  });

  it("only applies a verified brand on its verified host", () => {
    expect(brandingForRequestHost(brand, "app.cafe-du-coin.ca")).toBe(brand);
    expect(brandingForRequestHost(brand, "minervaflow.app")).toBe(brand);
    expect(brandingForRequestHost(brand, "app.other-brand.ca")).toBeNull();
  });

  it("keeps the workspace default before a custom domain is verified", () => {
    expect(brandingForRequestHost({ ...brand, customDomainStatus: "en_attente" }, "app.other-brand.ca")).not.toBeNull();
  });
});
