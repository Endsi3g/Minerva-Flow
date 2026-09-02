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

  const title = "Minerva Flow — Système d'Analyse & Gestion Intelligente pour Restaurants (Québec & France)";
  const description = "Minerva Flow est la plateforme SaaS de gestion opérationnelle pour restaurants et cafés au Québec. Centralisez finances, inventaire, équipe et analyse IA dans une interface unifiée.";

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
        template: "%s | Minerva Flow",
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
        "Seuil de rentabilité restaurant",
        "Analyse financière bistro",
        "POS Square integration",
        "Food Cost calcul",
        "IA Restauration",
        "Gestion d'équipe restaurant",
      ],
      authors: [{ name: "Minerva Flow Team", url: "https://minervaflow.app" }],
      creator: "Minerva Flow",
      publisher: "Minerva Flow Inc.",
      manifest: "/manifest.webmanifest",
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: `${baseUrl}/${locale}`,
        languages: {
          "fr-CA": `${baseUrl}/fr`,
          "fr-FR": `${baseUrl}/fr`,
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
        url: `${baseUrl}/${locale}`,
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

  // Schema.org JSON-LD Structured Data for Software Application & Organization
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Minerva Flow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CAD",
    },
    description: "Système unifié d'exploitation, de prévision financière et d'analyse IA pour restaurants au Québec et en France.",
    author: {
      "@type": "Organization",
      name: "Minerva Flow",
      url: "https://minervaflow.app",
    },
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
