import type { Metadata } from "next";

// The customer-facing PWA identity: overrides the staff manifest
// (app/manifest.ts, start_url /overview) so a customer installing from the
// public menu gets an app that reopens on their portal, not the staff login.
export const metadata: Metadata = {
  manifest: "/client-manifest.webmanifest",
};

export default function PublicMenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
