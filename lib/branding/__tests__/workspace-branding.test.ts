import { describe, expect, it } from "vitest";
import { normalizeRequestedDomain } from "@/lib/branding/workspace-branding";

describe("normalizeRequestedDomain", () => {
  it("normalizes a hostname entered as a URL", () => {
    expect(normalizeRequestedDomain(" https://App.Cafe-Du-Coin.ca/ ")).toBe("app.cafe-du-coin.ca");
  });

  it("rejects paths, localhost and malformed hostnames", () => {
    expect(normalizeRequestedDomain("cafe.ca/login")).toBeNull();
    expect(normalizeRequestedDomain("localhost")).toBeNull();
    expect(normalizeRequestedDomain("not a domain")).toBeNull();
  });
});
