import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { soleOwnedRestaurantIds } from "../account-deletion";

describe("soleOwnedRestaurantIds", () => {
  it("keeps only restaurants with no other active owner", () => {
    expect(soleOwnedRestaurantIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });
  it("is empty when every restaurant has another owner", () => {
    expect(soleOwnedRestaurantIds(["a"], ["a", "x"])).toEqual([]);
  });
  it("is empty when the user owns nothing", () => {
    expect(soleOwnedRestaurantIds([], ["a"])).toEqual([]);
  });
});
