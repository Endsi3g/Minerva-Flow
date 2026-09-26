import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  ["Menu", "/menu", "Articles, catégories et import du menu."],
  ["Identité visuelle", "/menu/design", "Logo, couleurs et aperçu public."],
  ["QR et partage", "/menu/qr", "Créer, imprimer et partager le code."],
  ["Coordonnées", "/menu/settings", "Réseaux sociaux et moyens de contact."],
] as const;

export function MenuStudioNav({ active }: { active: (typeof links)[number][0] }) {
  return (
    <nav aria-label="Pages Flow Direct" className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {links.map(([label, href, description]) => (
        <Link key={href} href={href} aria-current={active === label ? "page" : undefined}
          className={cn("rounded-xl border p-3 transition-colors", active === label
            ? "border-mv-green/30 bg-mv-green-tint/60 text-mv-green-dark" : "border-mv-border-soft bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink")}>
          <span className="block text-[12.5px] font-semibold">{label}</span>
          <span className="mt-1 block text-[11px] leading-relaxed text-mv-ink-faint">{description}</span>
        </Link>
      ))}
    </nav>
  );
}
