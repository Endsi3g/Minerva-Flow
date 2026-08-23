import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { Analytics } from "@vercel/analytics/react";
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
  en: "en_US",
  tr: "tr_TR",
};

const metadataByLocale: Record<string, { title: string; description: string; keywords: string[] }> = {
  fr: {
    title: "Minerva Flow — Système d'Analyse & Gestion Intelligente pour Restaurants (Québec & France)",
    description:
      "Minerva Flow est la plateforme SaaS de gestion opérationnelle pour restaurants et cafés au Québec. Centralisez finances, inventaire, équipe et analyse IA dans une interface unifiée.",
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
  },
  en: {
    title: "Minerva Flow — Smart Analytics & Management System for Restaurants",
    description:
      "Minerva Flow is the operational management SaaS platform for restaurants and cafés. Centralize finance, inventory, team and AI analysis in one unified interface.",
    keywords: [
      "Minerva Flow",
      "Restaurant Management Software",
      "Restaurant POS Integration",
      "Break-even calculator restaurant",
      "Financial analysis bistro",
      "POS Square integration",
      "Food cost calculation",
      "AI for restaurants",
      "Restaurant team management",
    ],
  },
  tr: {
    title: "Minerva Flow — Restoranlar için Akıllı Analiz ve Yönetim Sistemi",
    description:
      "Minerva Flow, restoran ve kafeler için operasyonel yönetim SaaS platformudur. Finans, envanter, ekip ve yapay zeka analizini tek bir arayüzde birleştirin.",
    keywords: [
      "Minerva Flow",
      "Restoran Yönetim Yazılımı",
      "Restoran POS Entegrasyonu",
      "Restoran başabaş noktası",
      "Bistro finansal analiz",
      "POS Square entegrasyonu",
      "Yemek maliyeti hesaplama",
      "Restoranlar için yapay zeka",
      "Restoran ekip yönetimi",
    ],
  },
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
  const { title, description, keywords } = metadataByLocale[locale] ?? metadataByLocale.fr;

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
    keywords,
    authors: [{ name: "Minerva Flow Team", url: "https://minerva-flow.vercel.app" }],
    creator: "Minerva Flow",
    publisher: "Minerva Flow Inc.",
    manifest: "/manifest.webmanifest",
    metadataBase: new URL("https://minerva-flow.vercel.app"),
    alternates: {
      canonical: `https://minerva-flow.vercel.app/${locale}`,
      languages: {
        "fr-CA": "https://minerva-flow.vercel.app/fr",
        "fr-FR": "https://minerva-flow.vercel.app/fr",
        "en-US": "https://minerva-flow.vercel.app/en",
        "en-GB": "https://minerva-flow.vercel.app/en",
        "tr-TR": "https://minerva-flow.vercel.app/tr",
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
      url: `https://minerva-flow.vercel.app/${locale}`,
      locale: ogLocale,
      images: [
        {
          url: "https://minerva-flow.vercel.app/icon-512.png",
          width: 512,
          height: 512,
          alt: "Minerva Flow — Système de Gestion de Restaurant Intelligente",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://minerva-flow.vercel.app/icon-512.png"],
      creator: "@MinervaFlow",
    },
    other: {
      "geo.region": "CA-QC",
      "geo.placename": "Montréal",
      "geo.position": "45.5017;-73.5673",
      ICBM: "45.5017, -73.5673",
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
    description: metadataByLocale[locale]?.description ?? metadataByLocale.fr.description,
    author: {
      "@type": "Organization",
      name: "Minerva Flow",
      url: "https://minerva-flow.vercel.app",
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
