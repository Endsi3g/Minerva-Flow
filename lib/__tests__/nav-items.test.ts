import { describe, expect, it } from "vitest";
import { isAuthenticatedProductPath } from "@/lib/nav-items";

describe("authenticated product route allowlist", () => {
  it.each([
    "/workspace",
    "/workspace/ambassadeurs",
    "/menu",
    "/menu/suggestions",
    "/fidelisation",
    "/fidelisation/customers",
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
    "/finance",
    "/changelog",
    "/collaborateurs",
    "/days",
    "/settings",
    "/menu-settings",
    "/fidelisationx",
    "/unknown",
    "/login",
  ]) (
    "does not overmatch %s",
    (path) => {
      expect(isAuthenticatedProductPath(path)).toBe(false);
    }
  );
});
