import { describe, expect, it } from "vitest";
import { isAuthenticatedProductPath, navItemsForRole } from "@/lib/nav-items";

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
    "/settings",
    "/menu-settings",
    "/fidelisationx",
    "/unknown",
    "/login",
  ])("redirects restricted or unrelated route %s", (path) => {
    expect(isAuthenticatedProductPath(path)).toBe(false);
  });

  it("exposes only the requested four owner navigation routes", () => {
    expect(navItemsForRole("owner").map(({ key }) => key)).toEqual([
      "workspace", "commandes", "inventaire", "fournisseurs",
    ]);
  });
});
