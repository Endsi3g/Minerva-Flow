import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, Inter, Playfair_Display } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { Analytics } from "@vercel/analytics/react";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const playfairDisplayHeading = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' });

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
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
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: "/icon-512.png",
      shortcut: "/icon-512.png",
      apple: "/icon-512.png",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      locale: ogLocales[locale] ?? "fr_FR",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: t("title") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og.png"],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Flow par Minerva",
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F5F1E6",
  viewportFit: "cover",
};

export default async function RootLayout({
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
    <html lang={locale} className={cn("h-full", jakarta.variable, fraunces.variable, "font-sans", inter.variable, playfairDisplayHeading.variable)}>
      <body className="min-h-full bg-mv-cream text-mv-ink antialiased">
        <NextIntlClientProvider>
          <TooltipProvider delay={150}>{children}</TooltipProvider>
          <Toaster />
          <ServiceWorkerManager />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
