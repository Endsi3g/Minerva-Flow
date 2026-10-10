import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte restaurant",
  description:
    "Essayez Minerva Flow gratuitement pendant le développement. Connectez votre caisse Square ou Lightspeed en 2 minutes, sans carte bancaire.",
  alternates: {
    canonical: "/sign-up",
  },
  openGraph: {
    title: "Minerva Flow | Créer un compte restaurant",
    description:
      "Rejoignez les cafés et restaurants qui font revenir leurs clients plus souvent et réduisent leur gaspillage.",
    images: ["/og.png"],
  },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
