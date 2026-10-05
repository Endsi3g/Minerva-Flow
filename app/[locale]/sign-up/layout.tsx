import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un Compte Restaurant (14 jours gratuits)",
  description:
    "Testez Minerva Flow gratuitement pendant 14 jours. Connectez votre caisse Square ou Lightspeed en 2 minutes, sans carte bancaire.",
  alternates: {
    canonical: "/sign-up",
  },
  openGraph: {
    title: "Minerva Flow | Créer un Compte Restaurant (14 jours gratuits)",
    description:
      "Rejoignez les cafés et restaurants qui font revenir leurs clients plus souvent et réduisent leur gaspillage.",
    images: ["/og.png"],
  },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
