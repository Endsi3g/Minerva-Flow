import { describe, expect, it } from "vitest";
import { canAccessSettings, navItemsForRole } from "@/lib/nav-items";

describe("navigation items by role", () => {
  it("exposes the LTV core, daily management, suppliers, settings and changelog to owners", () => {
    const keys = navItemsForRole("owner").map(({ key }) => key);
    for (const key of [
      "workspace", "overview", "assistant", "menu", "fidelisation",
      "finance", "commandes", "collaborateurs", "inventaire", "fournisseurs",
      "settings", "changelog",
    ]) {
      expect(keys).toContain(key);
    }
  });

  it("keeps manager-only areas away from staff and consultants", () => {
    for (const role of ["staff", "consultant"] as const) {
      const keys = navItemsForRole(role).map(({ key }) => key);
      for (const key of ["finance", "inventaire", "fournisseurs", "settings", "billing"]) {
        expect(keys).not.toContain(key);
      }
      for (const key of ["overview", "assistant", "menu", "fidelisation", "commandes", "collaborateurs", "changelog"]) {
        expect(keys).toContain(key);
      }
    }
  });

  it("restricts billing to owners", () => {
    expect(navItemsForRole("owner").some(({ key }) => key === "billing")).toBe(true);
    expect(navItemsForRole("manager").some(({ key }) => key === "billing")).toBe(false);
  });

  it("honors per-member sidebar permissions but always keeps the workspace entry", () => {
    const keys = navItemsForRole("owner", ["menu"]).map(({ key }) => key);
    expect(keys).toEqual(["workspace", "menu"]);
  });

  it("only lets owners and managers open Settings", () => {
    expect(canAccessSettings("staff")).toBe(false);
    expect(canAccessSettings("consultant")).toBe(false);
    expect(canAccessSettings("owner")).toBe(true);
    expect(canAccessSettings("manager")).toBe(true);
  });
});
