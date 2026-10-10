import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/shell/Logo";
import { latestDesktopRelease } from "@/lib/desktop/releases";

export const revalidate = 600;

type Locale = "fr" | "en";
type Platform = "windows" | "macos";

/** Illustration of an OS dialog, drawn in HTML (not a screenshot): the real wording and layout vary by OS version. */
function DialogMock({ tone, title, body, link, button, highlight }: {
  tone: "windows" | "mac";
  title: string;
  body: string;
  link?: string;
  button?: string;
  highlight: "link" | "button";
}) {
  const win = tone === "windows";
  return (
    <div
      aria-hidden="true"
      className={`mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border shadow-md ${win ? "border-[#1f4e8c]/30 bg-[#0f4c9b] text-white" : "border-mv-border bg-[#f2f2f4] text-[#1d1d1f]"}`}
    >
      <div className={`px-5 py-4 ${win ? "" : "text-center"}`}>
        <p className={`${win ? "text-[17px] font-semibold" : "text-[15px] font-semibold"}`}>{title}</p>
        <p className={`mt-2 text-[13px] leading-snug ${win ? "text-white/85" : "text-[#4a4a4f]"}`}>{body}</p>
        {link && (
          <p className="mt-3">
            <span className={`inline-block rounded px-1.5 py-0.5 text-[13px] underline ${highlight === "link" ? "bg-yellow-300 font-semibold text-[#1d1d1f] ring-2 ring-yellow-400" : "text-white/90"}`}>{link}</span>
          </p>
        )}
      </div>
      {button && (
        <div className={`flex justify-end gap-2 px-5 pb-4 ${win ? "" : "justify-center"}`}>
          <span className={`rounded px-3 py-1.5 text-[13px] font-semibold ${highlight === "button" ? "bg-yellow-300 text-[#1d1d1f] ring-2 ring-yellow-400" : win ? "bg-white/20" : "bg-white"}`}>{button}</span>
          <span className={`rounded px-3 py-1.5 text-[13px] ${win ? "bg-white/20" : "bg-white text-[#4a4a4f]"}`}>{win ? "Ne pas exécuter" : "OK"}</span>
        </div>
      )}
    </div>
  );
}

const copy = {
  fr: {
    back: "Retour",
    winTitle: "Installer Minerva Flow sur Windows",
    macTitle: "Installer Minerva Flow sur macOS",
    winLead: "Avant de télécharger : Windows va afficher un avertissement. C'est attendu et sans danger.",
    macLead: "Avant de télécharger : macOS peut afficher un avertissement à la première ouverture. C'est attendu et sans danger.",
    winWhy: "Pour l'instant, l'installateur n'est pas encore signé par Microsoft : le certificat de signature est en cours d'obtention. Windows affiche donc « Windows a protégé votre ordinateur » pour tout programme qu'il ne connaît pas encore. L'application est sûre, et vous pouvez vérifier l'empreinte du fichier plus bas.",
    macWhy: "Pour l'instant, l'application n'est pas encore signée et notariée par Apple : la signature est en cours de mise en place. macOS affiche donc un avertissement à la première ouverture. L'application est sûre, et vous pouvez vérifier l'empreinte du fichier plus bas.",
    stepsHeading: "Les étapes",
    winSteps: [
      "Téléchargez le fichier, puis ouvrez-le (double-clic).",
      "Windows affiche « Windows a protégé votre ordinateur ». Cliquez sur « Informations complémentaires ».",
      "Cliquez sur « Exécuter quand même ». L'installation se termine en quelques secondes.",
    ],
    macSteps: [
      "Téléchargez le fichier .dmg, ouvrez-le et glissez Minerva Flow dans le dossier Applications.",
      "À la première ouverture, si macOS refuse : faites un clic droit (ou Ctrl-clic) sur Minerva Flow dans Applications, puis « Ouvrir ».",
      "Confirmez en cliquant sur « Ouvrir ». Les ouvertures suivantes sont normales.",
    ],
    illustration: "Illustration : l'écran exact varie selon votre version de Windows.",
    macIllustration: "Illustration : l'écran exact varie selon votre version de macOS.",
    winDialog1: { title: "Windows a protégé votre ordinateur", body: "Microsoft Defender SmartScreen a empêché le démarrage d'une application non reconnue.", link: "Informations complémentaires" },
    winDialog2: { title: "Windows a protégé votre ordinateur", body: "Application : Minerva Flow · Éditeur : Éditeur inconnu", button: "Exécuter quand même" },
    macDialog: { title: "« Minerva Flow » ne peut pas être ouvert", body: "Apple ne peut pas vérifier que cette app ne contient pas de logiciel malveillant.", button: "Ouvrir" },
    download: "Télécharger",
    version: "Version",
    updates: "Après l'installation, l'application se met à jour toute seule : vous n'aurez pas à repasser par cette page.",
    verifyHeading: "Vérifier le fichier (facultatif)",
    verifyBody: "Comparez l'empreinte SHA-256 du fichier téléchargé avec celle-ci :",
    winVerify: "Dans PowerShell : Get-FileHash chemin\\du\\fichier",
    macVerify: "Dans le Terminal : shasum -a 256 chemin/du/fichier",
    unavailable: "Cet installateur n'est pas encore disponible. Écrivez-nous à flow@minervaflow.app.",
  },
  en: {
    back: "Back",
    winTitle: "Install Minerva Flow on Windows",
    macTitle: "Install Minerva Flow on macOS",
    winLead: "Before you download: Windows will show a warning. It is expected and harmless.",
    macLead: "Before you download: macOS may show a warning the first time you open it. It is expected and harmless.",
    winWhy: "The installer is not signed by Microsoft yet: the signing certificate is being obtained. Windows therefore shows “Windows protected your PC” for any program it does not know yet. The app is safe, and you can verify the file fingerprint below.",
    macWhy: "The app is not signed and notarized by Apple yet: signing is being set up. macOS therefore shows a warning the first time you open it. The app is safe, and you can verify the file fingerprint below.",
    stepsHeading: "The steps",
    winSteps: [
      "Download the file, then open it (double-click).",
      "Windows shows “Windows protected your PC”. Click “More info”.",
      "Click “Run anyway”. Installation finishes in a few seconds.",
    ],
    macSteps: [
      "Download the .dmg file, open it and drag Minerva Flow into the Applications folder.",
      "The first time, if macOS refuses: right-click (or Ctrl-click) Minerva Flow in Applications, then “Open”.",
      "Confirm by clicking “Open”. Later launches are normal.",
    ],
    illustration: "Illustration: the exact screen varies with your Windows version.",
    macIllustration: "Illustration: the exact screen varies with your macOS version.",
    winDialog1: { title: "Windows protected your PC", body: "Microsoft Defender SmartScreen prevented an unrecognized app from starting.", link: "More info" },
    winDialog2: { title: "Windows protected your PC", body: "App: Minerva Flow · Publisher: Unknown publisher", button: "Run anyway" },
    macDialog: { title: "“Minerva Flow” cannot be opened", body: "Apple cannot check it for malicious software.", button: "Open" },
    download: "Download",
    version: "Version",
    updates: "After installing, the app updates itself: you will not need to come back to this page.",
    verifyHeading: "Verify the file (optional)",
    verifyBody: "Compare the downloaded file's SHA-256 fingerprint with this one:",
    winVerify: "In PowerShell: Get-FileHash path\\to\\file",
    macVerify: "In Terminal: shasum -a 256 path/to/file",
    unavailable: "This installer is not available yet. Email us at flow@minervaflow.app.",
  },
} satisfies Record<Locale, Record<string, unknown>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; platform: string }> }): Promise<Metadata> {
  const { locale, platform } = await params;
  const content = copy[locale === "en" ? "en" : "fr"];
  return { title: platform === "windows" ? content.winTitle : content.macTitle, alternates: { canonical: `/download/${platform}` } };
}

export default async function DesktopInstallGuide({ params }: { params: Promise<{ locale: string; platform: string }> }) {
  const { locale, platform } = await params;
  if (platform !== "windows" && platform !== "macos") notFound();
  const kind = platform as Platform;
  const content = copy[locale === "en" ? "en" : "fr"];
  const prefix = locale === "en" ? "/en" : "";
  const release = await latestDesktopRelease();
  const asset = kind === "windows" ? release?.win : release?.mac;
  const steps = kind === "windows" ? content.winSteps : content.macSteps;

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-12 text-mv-ink">
      <div className="mx-auto max-w-2xl">
        <Link href={`${prefix}/download`} className="mb-8 inline-flex items-center gap-2.5 text-[13px] font-semibold text-mv-green-dark">
          <LogoMark size={22} />
          <span>← {content.back}</span>
        </Link>

        <h1 className="mb-3 font-display text-[36px] font-semibold leading-tight tracking-tight">
          {kind === "windows" ? content.winTitle : content.macTitle}
        </h1>
        <p className="mb-4 text-[16px] font-medium leading-relaxed">{kind === "windows" ? content.winLead : content.macLead}</p>
        <p className="mb-10 rounded-2xl border border-mv-border bg-mv-surface p-4 text-[14px] leading-relaxed text-mv-ink-soft">
          {kind === "windows" ? content.winWhy : content.macWhy}
        </p>

        <h2 className="mb-4 font-display text-[22px] font-semibold">{content.stepsHeading}</h2>
        <ol className="mb-8 flex flex-col gap-8">
          {steps.map((text, index) => (
            <li key={text} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mv-green-dark text-[13px] font-bold text-white">{index + 1}</span>
                <p className="pt-0.5 text-[15px] leading-relaxed">{text}</p>
              </div>
              {kind === "windows" && index === 1 && (
                <DialogMock tone="windows" {...content.winDialog1} highlight="link" />
              )}
              {kind === "windows" && index === 2 && (
                <DialogMock tone="windows" {...content.winDialog2} highlight="button" />
              )}
              {kind === "macos" && index === 1 && (
                <DialogMock tone="mac" {...content.macDialog} highlight="button" />
              )}
            </li>
          ))}
        </ol>
        <p className="mb-8 text-[12px] text-mv-ink-faint">{kind === "windows" ? content.illustration : content.macIllustration}</p>

        {asset ? (
          <div className="flex flex-col gap-3">
            <a
              href={asset.url}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-mv-green-dark px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-dark"
            >
              {content.download} · {content.version} {release?.version}
            </a>
            <p className="text-[13px] text-mv-ink-soft">{content.updates}</p>
          </div>
        ) : (
          <p className="text-[14px] text-mv-ink-soft">{content.unavailable}</p>
        )}

        {asset?.sha256 && (
          <div className="mt-10 rounded-2xl border border-mv-border bg-mv-surface p-4">
            <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold"><ShieldCheck size={16} className="text-mv-green-dark" /> {content.verifyHeading}</p>
            <p className="mb-2 text-[13px] text-mv-ink-soft">{content.verifyBody}</p>
            <code className="block break-all rounded-lg bg-mv-cream px-3 py-2 font-mono text-[12px]">{asset.sha256}</code>
            <p className="mt-2 text-[12px] text-mv-ink-faint">{kind === "windows" ? content.winVerify : content.macVerify}</p>
          </div>
        )}
      </div>
    </div>
  );
}
