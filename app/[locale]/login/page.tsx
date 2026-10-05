import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Connexion Restaurateur & Équipe",
    description:
      "Connectez-vous à votre restaurant pour voir vos ventes en direct, vos marges et vos clients habitués.",
    alternates: {
      canonical: "/login",
    },
    openGraph: {
      title: "Minerva Flow | Connexion Restaurateur & Équipe",
      description:
        "Accédez à vos ventes en direct, vos coûts de revient et vos clients fidèles.",
      images: ["/og.png"],
    },
  };
}

export default function LoginPage() {
  return <AuthCard initialMode="login" />;
}
