import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/shell/Logo";
import { DESKTOP_RELEASES_URL, latestDesktopRelease } from "@/lib/desktop/releases";

// Re-read the latest published release at most every 10 minutes.
export const revalidate = 600;

type Locale = "fr" | "en";

const copy = {
  fr: {
    title: "Minerva Flow pour ordinateur",
    description: "Téléchargez Minerva Flow pour macOS et Windows : commandes en direct, menu, inventaire, fidélité, impression de tickets et mode caisse.",
    heading: "Minerva Flow pour ordinateur",
    intro: "Le portail complet dans une application : alerte sonore à chaque nouvelle commande, impression de tickets et mode caisse plein écran. L'application se met à jour toute seule.",
    mac: "macOS",
    macNote: "Apple silicium et Intel, macOS 11 ou plus récent.",
    win: "Windows",
    winNote: "Windows 10 et 11, 64 bits.",
    cta: "Voir comment l'installer",
    version: "Version",
    soon: "Les installateurs seront disponibles ici très bientôt. Écrivez-nous pour recevoir un accès anticipé.",
    all: "Toutes les versions",
    web: "Vous pouvez aussi utiliser Minerva Flow dans votre navigateur.",
    open: "Ouvrir le portail web",
    contact: "Une question ? flow@minervaflow.app",
  },
  en: {
    title: "Minerva Flow for desktop",
    description: "Download Minerva Flow for macOS and Windows: live orders, menu, inventory, loyalty, ticket printing and cash-register mode.",
    heading: "Minerva Flow for desktop",
    intro: "The full portal in an app: a sound for every new order, ticket printing and full-screen cash-register mode. The app updates itself.",
    mac: "macOS",
    macNote: "Apple silicon and Intel, macOS 11 or later.",
    win: "Windows",
    winNote: "Windows 10 and 11, 64-bit.",
    cta: "See how to install it",
    version: "Version",
    soon: "Installers will be available here very soon. Email us for early access.",
    all: "All versions",
    web: "You can also use Minerva Flow in your browser.",
    open: "Open the web portal",
    contact: "Questions? flow@minervaflow.app",
  },
} satisfies Record<Locale, Record<string, string>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];
  return { title: content.title, description: content.description, alternates: { canonical: "/download" } };
}

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];
  const release = await latestDesktopRelease();
  const prefix = locale === "en" ? "/en" : "";

  const platforms = [
    { key: "macos", name: content.mac, note: content.macNote, available: Boolean(release?.mac) },
    { key: "windows", name: content.win, note: content.winNote, available: Boolean(release?.win) },
  ];

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-12 text-mv-ink">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-10 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[17px] font-bold text-mv-ink">Minerva Flow</span>
        </Link>

        <h1 className="mb-3 font-display text-[40px] font-semibold leading-tight tracking-tight">{content.heading}</h1>
        <p className="mb-10 max-w-xl text-[16px] leading-relaxed text-mv-ink-soft">{content.intro}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {platforms.map((platform) => (
            <div key={platform.key} className="flex flex-col gap-4 rounded-2xl border border-mv-border bg-mv-surface p-6">
              <div>
                <h2 className="font-display text-[22px] font-semibold">{platform.name}</h2>
                <p className="mt-1 text-[13px] text-mv-ink-soft">{platform.note}</p>
              </div>
              {platform.available ? (
                <Link
                  href={`${prefix}/download/${platform.key}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-mv-green-dark px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-dark"
                >
                  {content.cta}
                  {release ? ` · ${content.version} ${release.version}` : ""}
                </Link>
              ) : (
                <p className="text-[13px] text-mv-ink-faint">{content.soon}</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-[13px]">
          <a href={DESKTOP_RELEASES_URL} className="font-semibold text-mv-green-dark underline">{content.all}</a>
        </p>

        <div className="mt-12 border-t border-mv-border pt-6 text-[14px] text-mv-ink-soft">
          <p className="mb-3">{content.web}</p>
          <Link href="/login" className="font-semibold text-mv-green-dark underline">{content.open}</Link>
          <p className="mt-6 text-[12px] text-mv-ink-faint">{content.contact}</p>
        </div>
      </div>
    </div>
  );
}
