import { describe, expect, it } from "vitest";
import { canAccessSettings, isAuthenticatedProductPath, navItemsForRole } from "@/lib/nav-items";

describe("authenticated product route allowlist", () => {
  it.each([
    "/workspace",
    "/workspace/ambassadeurs",
    "/fournisseurs",
    "/fournisseurs/catalogue",
    "/inventaire",
    "/inventaire/recettes",
    "/commandes",
    "/commandes/service-quotes",
    "/settings",
    "/settings/alertes",
  ])("keeps the product route %s reachable", (path) => {
    expect(isAuthenticatedProductPath(path)).toBe(true);
  });

  it.each([
    "/overview",
    "/assistant",
    "/menu",
    "/menu/suggestions",
    "/fidelisation",
    "/fidelisation/customers",
    "/finance",
    "/collaborateurs",
    "/changelog",
    "/menu-settings",
    "/fidelisationx",
    "/unknown",
    "/login",
  ])("redirects restricted or unrelated route %s", (path) => {
    expect(isAuthenticatedProductPath(path)).toBe(false);
  });

  it("exposes the four core owner routes and the necessary Settings entry", () => {
    expect(navItemsForRole("owner").map(({ key }) => key)).toEqual([
      "workspace", "commandes", "inventaire", "fournisseurs", "settings",
    ]);
  });

  it("does not expose Settings to staff", () => {
    expect(navItemsForRole("staff").some(({ key }) => key === "settings")).toBe(false);
    expect(canAccessSettings("staff")).toBe(false);
    expect(canAccessSettings("consultant")).toBe(false);
    expect(canAccessSettings("owner")).toBe(true);
    expect(canAccessSettings("manager")).toBe(true);
  });
});
