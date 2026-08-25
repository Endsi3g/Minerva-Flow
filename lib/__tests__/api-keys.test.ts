import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateRawApiKey, hashApiKey } from "@/lib/data/api-keys";

describe("API Keys hashing and generation", () => {
  it("generates random keys with prefix and hashes deterministically", () => {
    const rawKey = generateRawApiKey("mcp_live");
    expect(rawKey.startsWith("mcp_live_")).toBe(true);
    expect(rawKey.length).toBeGreaterThan(20);

    const hash1 = hashApiKey(rawKey);
    const hash2 = hashApiKey(rawKey);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // sha256 hex length
  });
});
