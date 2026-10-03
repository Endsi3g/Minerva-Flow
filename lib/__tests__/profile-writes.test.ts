import { describe, expect, it } from "vitest";
import { GITHUB_LOGIN_RE, detectPlatform, validateContentLink } from "@/lib/team/profile-writes";

describe("liens de contenu", () => {
  it("détecte la plateforme depuis le domaine", () => {
    expect(detectPlatform("www.instagram.com")).toBe("instagram");
    expect(detectPlatform("vm.tiktok.com")).toBe("tiktok");
    expect(detectPlatform("youtu.be")).toBe("youtube");
    expect(detectPlatform("ca.linkedin.com")).toBe("linkedin");
    expect(detectPlatform("exemple.com")).toBe("other");
  });

  it("n'est pas dupé par un domaine qui contient juste le nom", () => {
    expect(detectPlatform("instagram.com.evil.example")).toBe("other");
    expect(detectPlatform("notinstagram.com")).toBe("other");
  });

  it("exige https et un lien valide", () => {
    expect(validateContentLink({ url: "http://instagram.com/p/1" }).ok).toBe(false);
    expect(validateContentLink({ url: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateContentLink({ url: "pas un lien" }).ok).toBe(false);
    const ok = validateContentLink({ url: " https://www.tiktok.com/@minerva/video/1 ", title: "  Démo  " });
    expect(ok).toMatchObject({ ok: true, value: { platform: "tiktok", title: "Démo" } });
  });

  it("refuse un titre trop long", () => {
    expect(validateContentLink({ url: "https://exemple.com", title: "x".repeat(161) }).ok).toBe(false);
  });
});

describe("identifiant GitHub", () => {
  it("accepte les formats GitHub valides et refuse le reste", () => {
    expect(GITHUB_LOGIN_RE.test("Endsi3g")).toBe(true);
    expect(GITHUB_LOGIN_RE.test("a-b-c")).toBe(true);
    expect(GITHUB_LOGIN_RE.test("")).toBe(false);
    expect(GITHUB_LOGIN_RE.test("a b")).toBe(false);
    expect(GITHUB_LOGIN_RE.test("a/../b")).toBe(false);
    expect(GITHUB_LOGIN_RE.test("x".repeat(40))).toBe(false);
  });
});
