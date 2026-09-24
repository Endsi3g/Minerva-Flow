import { describe, expect, it } from "vitest";
import { isAuthenticatedProductPath, NAV_ITEMS, navItemsForRole } from "@/lib/nav-items";

describe("authenticated product route allowlist", () => {
  it("keeps every authenticated navigation route reachable", () => {
    for (const { href } of NAV_ITEMS) {
      expect(isAuthenticatedProductPath(href), `${href} should be reachable`).toBe(true);
    }
  });

  it.each([
    "/workspace/ambassadeurs",
    "/fournisseurs/catalogue",
    "/inventaire/recettes",
    "/commandes/service-quotes",
    "/fidelisation/partage",
    "/menu/suggestions",
  ])("keeps the nested core route %s reachable", (path) => {
    expect(isAuthenticatedProductPath(path)).toBe(true);
  });

  it.each([
    "/menu-settings",
    "/fidelisationx",
    "/unknown",
    "/login",
  ])("redirects restricted or unrelated route %s", (path) => {
    expect(isAuthenticatedProductPath(path)).toBe(false);
  });

  it("keeps owner ordering and loyalty tools in the searchable primary routes", () => {
    const keys = navItemsForRole("owner").map(({ key }) => key);
    expect(keys).toContain("menu");
    expect(keys).toContain("fidelisation");
    expect(keys).toContain("overview");
    expect(keys).toContain("assistant");
  });
});
