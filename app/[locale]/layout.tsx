import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-heading-fallback",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const ogLocales: Record<string, string> = {
  fr: "fr_CA",
  tr: "tr_TR",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const ogLocale = ogLocales[locale] ?? "fr_CA";

  const title = "Minerva Flow | Fidélité et gestion pour restaurants et cafés";
  const description = "Minerva Flow aide les restaurants et cafés indépendants à faire revenir leurs clients : points, récompenses, carte dans le téléphone, menu, commandes et avis.";

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://minervaflow.app");

    return {
      title: {
        default: title,
        template: "Minerva Flow | %s",
      },
      description,
      applicationName: "Minerva Flow",
      verification: {
        google: "2k08zY7Mxenx_aiBOJ-Tlto9kEVG6nYdbitk6K5OQ-8",
      },
      keywords: [
        "Minerva Flow",
        "Gestion Restaurant Québec",
        "Logiciel Restaurant Montréal",
        "Calcul Prime Cost restauration",
        "Seuil de rentabilité restaurant",
        "Food Cost ratio formule",
        "Labor Cost masse salariale",
        "Fidélisation Apple Wallet restaurant",
        "Google Wallet pass fidélité",
        "POS Square integration",
        "Lightspeed restaurant intégration",
        "IA Restauration Flow AI",
        "Gestion d'équipe bistro café",
      ],
      authors: [{ name: "Minerva Flow Team", url: "https://minervaflow.app" }],
      creator: "Minerva Flow",
      publisher: "Minerva Flow Inc.",
      manifest: "/manifest.webmanifest",
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: locale === "fr" ? baseUrl : `${baseUrl}/${locale}`,
        languages: {
          "fr-CA": baseUrl,
          "en-CA": `${baseUrl}/en`,
          "tr-TR": `${baseUrl}/tr`,
        },
      },
      icons: {
        icon: [
          { url: "/favicon.ico", sizes: "any" },
          { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
      },
      openGraph: {
        type: "website",
        siteName: "Minerva Flow",
        title,
        description,
        url: locale === "fr" ? baseUrl : `${baseUrl}/${locale}`,
        locale: ogLocale,
        images: [
          {
            url: "/og.png",
            secureUrl: `${baseUrl}/og.png`,
            width: 1200,
            height: 630,
            alt: "Minerva Flow — Système de Gestion & Rentabilité pour Restaurants",
            type: "image/png",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og.png"],
        creator: "@MinervaFlow",
      },
    other: {
      "geo.region": "CA-QC",
      "geo.placename": "Montréal",
      "geo.position": "45.5017;-73.5673",
      "geo.country": "CA",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f1e6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";

  // Comprehensive Schema.org JSON-LD @graph for AI Search Engines & Google Knowledge Graph
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}#software`,
        name: "Minerva Flow",
        alternateName: ["Flow", "Minerva Flow Restaurant Management"],
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Restaurant Management & Financial Copilot",
        operatingSystem: "Web, iOS",
        description:
          "Logiciel pour restaurants et cafés : programme de fidélité, carte client dans l'app, menu et commandes, avis clients.",
        featureList: [
          "Points, paliers, récompenses et parrainage",
          "Carte client dans l'application et Apple Wallet",
          "Identification au comptoir par téléphone et code de confirmation",
          "Menu, commandes et avis clients",
          "Conçu pour la Loi canadienne anti-pourriel, la Loi 25 et la Loi 96",
        ],
        author: {
          "@id": `${baseUrl}#organization`,
        },
        publisher: {
          "@id": `${baseUrl}#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        name: "Minerva Flow",
        legalName: "Minerva Technologies Inc.",
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/icon-512.png`,
          width: 512,
          height: 512,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Montréal",
          addressRegion: "QC",
          addressCountry: "CA",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            email: "support@minervaflow.app",
            contactType: "customer support",
            availableLanguage: ["French", "English"],
          },
          {
            "@type": "ContactPoint",
            email: "privacy@minervaflow.app",
            contactType: "compliance",
            availableLanguage: ["French", "English"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}#website`,
        name: "Minerva Flow",
        url: baseUrl,
        publisher: {
          "@id": `${baseUrl}#organization`,
        },
        inLanguage: ["fr-CA", "en-CA"],
      },
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Qu'est-ce que le Prime Cost en restauration ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "C'est le coût des aliments et boissons plus la masse salariale, divisé par les ventes nettes avant taxes. Les repères souvent cités se situent autour de 60 % à 65 %, mais ils varient selon le concept.",
            },
          },
          {
            "@type": "Question",
            name: "Un client doit-il installer l'application pour s'inscrire ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Non. Il s'inscrit par QR code ou avec le personnel. L'application montre son solde à jour, ses récompenses et son parrainage.",
            },
          },
          {
            "@type": "Question",
            name: "Comment le comptoir crédite-t-il les points sans caisse connectée ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Le personnel retrouve le client par son numéro de téléphone, vérifie le code à 6 chiffres affiché dans son application, puis saisit le montant de l'achat.",
            },
          },
          {
            "@type": "Question",
            name: "Peut-on écrire à tous ses clients ?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Seulement à ceux qui ont consenti à recevoir des messages promotionnels, comme l'exige la Loi canadienne anti-pourriel.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full",
        jakarta.variable,
        playfairDisplay.variable,
        jetbrainsMono.variable,
        "font-sans"
      )}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-mv-cream text-mv-ink antialiased">
        <Script
          src="https://www.vesk.dev/a.js"
          data-key="7e85d29120374ba48b24f0f7332ad114"
          strategy="afterInteractive"
        />
        <ThemeProvider>
          <NextIntlClientProvider>
            <TooltipProvider delay={150}>{children}</TooltipProvider>
            <Toaster />
            <ServiceWorkerManager />
            <Analytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
