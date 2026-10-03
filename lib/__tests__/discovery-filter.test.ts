import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { discoveryFilter } from "@/lib/data/discovery-scope";

describe("discoveryFilter", () => {
  it("never shows demo restaurants to a real customer", () => {
    for (const scope of [
      { mode: "open", viewerIsDemo: false },
      { mode: "workspace", workspaceId: "w1", viewerIsDemo: false },
      { mode: "single", restaurantId: "r1", viewerIsDemo: false },
    ] as const) {
      expect(discoveryFilter(scope).excludeDemo).toBe(true);
    }
  });

  it("lists paid-tier restaurants for essentiel viewers alongside their own franchise", () => {
    expect(discoveryFilter({ mode: "workspace", workspaceId: "w1", viewerIsDemo: false }).or).toBe(
      "workspace_id.eq.w1,plan_tier.neq.essentiel"
    );
    expect(discoveryFilter({ mode: "single", restaurantId: "r1", viewerIsDemo: false }).or).toBe(
      "id.eq.r1,plan_tier.neq.essentiel"
    );
  });

  it("keeps the open marketplace unrestricted for non-essentiel viewers", () => {
    expect(discoveryFilter({ mode: "open", viewerIsDemo: false })).toEqual({ or: null, excludeDemo: true });
  });

  it("shows a demo account every demo restaurant plus the real promoted ones", () => {
    expect(discoveryFilter({ mode: "workspace", workspaceId: "w1", viewerIsDemo: true })).toEqual({
      or: "is_demo.eq.true,plan_tier.neq.essentiel",
      excludeDemo: false,
    });
    expect(discoveryFilter({ mode: "open", viewerIsDemo: true })).toEqual({ or: null, excludeDemo: false });
  });
});
