import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réinitialisation du Mot de Passe",
  description:
    "Réinitialisez le mot de passe de votre compte restaurateur ou gestionnaire Minerva Flow en toute sécurité.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
