import { describe, expect, it } from "vitest";
import { shouldRedirectCustomerToPortal } from "@/lib/auth/customer-entry";

describe("customer workspace entry", () => {
  it("sends a linked customer to the portal before onboarding", () => {
    expect(shouldRedirectCustomerToPortal({
      isAuthenticated: true,
      hasRestaurantMembership: false,
      isPlatformAdmin: false,
      customerRecordCount: 1,
    })).toBe(true);
  });

  it("keeps staff, restaurant members, and anonymous visitors out of the customer portal", () => {
    const base = {
      isAuthenticated: true,
      hasRestaurantMembership: false,
      isPlatformAdmin: false,
      customerRecordCount: 1,
    };

    expect(shouldRedirectCustomerToPortal({ ...base, hasRestaurantMembership: true })).toBe(false);
    expect(shouldRedirectCustomerToPortal({ ...base, isPlatformAdmin: true })).toBe(false);
    expect(shouldRedirectCustomerToPortal({ ...base, isAuthenticated: false })).toBe(false);
    expect(shouldRedirectCustomerToPortal({ ...base, customerRecordCount: 0 })).toBe(false);
  });
});
