import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { signOAuthState, verifyOAuthState } from "@/lib/ad-platforms/state";
import {
  getInstagramAppId,
  getInstagramAppSecret,
  isInstagramConfigured,
  INSTAGRAM_DIRECT_SCOPES,
  INSTAGRAM_FACEBOOK_SCOPES,
} from "@/lib/ad-platforms/config";

describe("Instagram OAuth & State Signing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SUPABASE_SERVICE_ROLE_KEY: "test-secret-service-role-key-12345" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("signs and verifies legacy state with restaurantId only", () => {
    const restaurantId = "rest-uuid-1234";
    const state = signOAuthState(restaurantId);
    expect(state).toBeTruthy();

    const verified = verifyOAuthState(state);
    expect(verified).not.toBeNull();
    expect(verified?.restaurantId).toBe(restaurantId);
    expect(verified?.extra).toBeUndefined();
  });

  it("signs and verifies state with extra mode (direct)", () => {
    const restaurantId = "rest-uuid-1234";
    const state = signOAuthState(restaurantId, "direct");
    const verified = verifyOAuthState(state);

    expect(verified).not.toBeNull();
    expect(verified?.restaurantId).toBe(restaurantId);
    expect(verified?.extra).toBe("direct");
  });

  it("signs and verifies state with extra mode (facebook)", () => {
    const restaurantId = "rest-uuid-5678";
    const state = signOAuthState(restaurantId, "facebook");
    const verified = verifyOAuthState(state);

    expect(verified).not.toBeNull();
    expect(verified?.restaurantId).toBe(restaurantId);
    expect(verified?.extra).toBe("facebook");
  });

  it("rejects forged or tampered state", () => {
    const restaurantId = "rest-uuid-1234";
    const state = signOAuthState(restaurantId, "direct");
    const tampered = state.slice(0, -4) + "XXXX";
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("resolves INSTAGRAM_APP_ID with fallback to META_APP_ID", () => {
    delete process.env.INSTAGRAM_APP_ID;
    delete process.env.META_APP_ID;
    expect(getInstagramAppId()).toBeUndefined();
    expect(isInstagramConfigured()).toBe(false);

    process.env.META_APP_ID = "meta-id-111";
    process.env.META_APP_SECRET = "meta-sec-222";
    expect(getInstagramAppId()).toBe("meta-id-111");
    expect(getInstagramAppSecret()).toBe("meta-sec-222");
    expect(isInstagramConfigured()).toBe(true);

    process.env.INSTAGRAM_APP_ID = "ig-id-999";
    process.env.INSTAGRAM_APP_SECRET = "ig-sec-888";
    expect(getInstagramAppId()).toBe("ig-id-999");
    expect(getInstagramAppSecret()).toBe("ig-sec-888");
  });

  it("includes official 2025/2026 scopes for direct Instagram Business Login", () => {
    expect(INSTAGRAM_DIRECT_SCOPES).toContain("instagram_business_basic");
    expect(INSTAGRAM_DIRECT_SCOPES).toContain("instagram_business_content_publish");
    expect(INSTAGRAM_DIRECT_SCOPES).toContain("instagram_business_manage_messages");
    expect(INSTAGRAM_DIRECT_SCOPES).toContain("instagram_business_manage_comments");
  });

  it("includes Facebook scopes for fallback login", () => {
    expect(INSTAGRAM_FACEBOOK_SCOPES).toContain("instagram_basic");
    expect(INSTAGRAM_FACEBOOK_SCOPES).toContain("instagram_content_publish");
    expect(INSTAGRAM_FACEBOOK_SCOPES).toContain("pages_show_list");
  });
});
