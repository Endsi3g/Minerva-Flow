import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Open_Sans, Cormorant_Infant, Varela_Round } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { Analytics } from "@vercel/analytics/react";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const openSansCondensed = Open_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const cormorantInfant = Cormorant_Infant({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const varelaRound = Varela_Round({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-sans",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ogLocales: Record<string, string> = {
  fr: "fr_FR",
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
  const ogLocale = ogLocales[locale] ?? "fr_FR";

  const defaultTitle = "Minerva Flow — Système de Gestion & d'Analyse pour Restaurants";
  const description = "Plateforme unifiée d'exploitation, de prévision financière, de gestion d'équipe et d'analyse IA pour restaurants.";

  return {
    title: {
      default: defaultTitle,
      template: "%s | Minerva Flow",
    },
    description,
    applicationName: "Minerva Flow",
    manifest: "/manifest.webmanifest",
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
      title: defaultTitle,
      description,
      locale: ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
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

  // Enables static rendering for this locale's pages.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full",
        jakarta.variable,
        varelaRound.variable,
        openSansCondensed.variable,
        cormorantInfant.variable,
        "font-sans"
      )}
    >
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
