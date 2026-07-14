import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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

export const metadata: Metadata = {
  title: "flow by Minerva",
  description: "L'application pour la gestions des revenus des restaurants et cafés au Quebec.",
  icons: {
    icon: "/icon-512.png",
    shortcut: "/icon-512.png",
    apple: "/icon-512.png",
  },
  openGraph: {
    title: "flow by Minerva",
    description: "L'application pour la gestions des revenus des restaurants et cafés au Quebec.",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flow by Minerva",
    description: "L'application pour la gestions des revenus des restaurants et cafés au Quebec.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F5F1E6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full", jakarta.variable, fraunces.variable, "font-sans", inter.variable, playfairDisplayHeading.variable)}>
      <body className="min-h-full bg-mv-cream text-mv-ink antialiased">
        <TooltipProvider delay={150}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
