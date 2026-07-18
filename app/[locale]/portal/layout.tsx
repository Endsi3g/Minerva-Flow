import type { Metadata } from "next";

// Same customer-facing PWA identity as app/m/layout.tsx — the portal is the
// client manifest's start_url, so it must claim the same manifest for the
// installed app to be recognized as one and the same.
export const metadata: Metadata = {
  manifest: "/client-manifest.webmanifest",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
