/** A customer with no staff restaurant membership belongs in the portal. */
export function shouldRedirectCustomerToPortal(input: {
  isAuthenticated: boolean;
  hasRestaurantMembership: boolean;
  isPlatformAdmin: boolean;
  customerRecordCount: number;
}): boolean {
  return input.isAuthenticated &&
    !input.hasRestaurantMembership &&
    !input.isPlatformAdmin &&
    input.customerRecordCount > 0;
}
