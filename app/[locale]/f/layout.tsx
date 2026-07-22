import type { Metadata } from "next";

// Same rationale as app/[locale]/m/layout.tsx — a customer joining a loyalty
// program from a public link is a customer-facing PWA context, not staff.
export const metadata: Metadata = {
  manifest: "/client-manifest.webmanifest",
};

export default function PublicLoyaltyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
