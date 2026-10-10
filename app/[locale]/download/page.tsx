import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/shell/Logo";

// Re-read the latest published release at most once an hour.
export const revalidate = 3600;

const REPO = "Endsi3g/Minerva-Flow";
const RELEASES_URL = `https://github.com/${REPO}/releases`;

type Locale = "fr" | "en";

const copy = {
  fr: {
    title: "Minerva Flow pour ordinateur",
    description: "Téléchargez Minerva Flow pour macOS et Windows : commandes en direct, menu, inventaire, fidélité, impression de tickets et mode caisse.",
    heading: "Minerva Flow pour ordinateur",
    intro: "Le portail complet dans une application : alerte sonore à chaque nouvelle commande, impression de tickets et mode caisse plein écran.",
    mac: "macOS",
    macNote: "Apple silicium et Intel, macOS 11 ou plus récent.",
    win: "Windows",
    winNote: "Windows 10 et 11, 64 bits.",
    download: "Télécharger",
    version: "Version",
    soon: "Les installateurs seront disponibles ici très bientôt. Écrivez-nous pour recevoir un accès anticipé.",
    all: "Toutes les versions",
    unsigned: "Cette version n'est pas encore signée : macOS et Windows peuvent afficher un avertissement à l'ouverture.",
    web: "Vous pouvez aussi utiliser Minerva Flow dans votre navigateur.",
    open: "Ouvrir le portail web",
    contact: "Une question ? flow@minervaflow.app",
  },
  en: {
    title: "Minerva Flow for desktop",
    description: "Download Minerva Flow for macOS and Windows: live orders, menu, inventory, loyalty, ticket printing and cash-register mode.",
    heading: "Minerva Flow for desktop",
    intro: "The full portal in an app: a sound for every new order, ticket printing and full-screen cash-register mode.",
    mac: "macOS",
    macNote: "Apple silicon and Intel, macOS 11 or later.",
    win: "Windows",
    winNote: "Windows 10 and 11, 64-bit.",
    download: "Download",
    version: "Version",
    soon: "Installers will be available here very soon. Email us for early access.",
    all: "All versions",
    unsigned: "This version is not signed yet: macOS and Windows may show a warning when you open it.",
    web: "You can also use Minerva Flow in your browser.",
    open: "Open the web portal",
    contact: "Questions? flow@minervaflow.app",
  },
} satisfies Record<Locale, Record<string, string>>;

type Asset = { name: string; browser_download_url: string };
type Release = { tag_name: string; draft: boolean; prerelease: boolean; assets: Asset[] };

async function latestDesktopRelease(): Promise<{ version: string; mac?: string; win?: string } | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const releases = (await response.json()) as Release[];
    const release = releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith("desktop-v"));
    if (!release) return null;
    const mac = release.assets.find((a) => a.name.endsWith(".dmg"))?.browser_download_url;
    const win =
      release.assets.find((a) => /-setup\.exe$/i.test(a.name))?.browser_download_url ??
      release.assets.find((a) => a.name.endsWith(".msi"))?.browser_download_url;
    if (!mac && !win) return null;
    return { version: release.tag_name.replace("desktop-v", ""), mac, win };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: "/download" },
  };
}

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];
  const release = await latestDesktopRelease();

  const platforms = [
    { key: "mac", name: content.mac, note: content.macNote, href: release?.mac },
    { key: "win", name: content.win, note: content.winNote, href: release?.win },
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
              {platform.href ? (
                <a
                  href={platform.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-mv-green-dark px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-dark"
                >
                  {content.download}
                  {release ? ` · ${content.version} ${release.version}` : ""}
                </a>
              ) : (
                <p className="text-[13px] text-mv-ink-faint">{content.soon}</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-mv-ink-faint">{content.unsigned}</p>
        <p className="mt-2 text-[13px]">
          <a href={RELEASES_URL} className="font-semibold text-mv-green-dark underline">{content.all}</a>
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
