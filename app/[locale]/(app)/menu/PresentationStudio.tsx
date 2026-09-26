"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { MenuStudioNav } from "./MenuStudioNav";
import { saveMenuPresentationAction } from "./actions";
import { toast } from "sonner";
import type { MenuPresentation } from "@/lib/types";
import { Check, Camera, Users, Music2, MessageCircle, Mail, Phone, Globe } from "lucide-react";

const palettes = [
  { name: "Forêt", backgroundColor: "#fafaf5", accentColor: "#167f5b", textColor: "#1a1e16" },
  { name: "Encre", backgroundColor: "#ffffff", accentColor: "#111111", textColor: "#151515" },
  { name: "Soleil", backgroundColor: "#fff7e8", accentColor: "#c04d2d", textColor: "#2c2118" },
  { name: "Minuit", backgroundColor: "#f3f3fa", accentColor: "#3347c7", textColor: "#18213a" },
];

const contactFields = [
  ["instagram", "Instagram", Camera, "https://instagram.com/votreresto"],
  ["facebook", "Facebook", Users, "https://facebook.com/votreresto"],
  ["tiktok", "TikTok", Music2, "https://tiktok.com/@votreresto"],
  ["whatsapp", "WhatsApp", MessageCircle, "https://wa.me/15145550123"],
  ["phone", "Téléphone", Phone, "+1 514 555 0123"],
  ["email", "Courriel", Mail, "bonjour@restaurant.ca"],
  ["website", "Site web", Globe, "https://restaurant.ca"],
] as const;

export function PresentationStudio({ restaurantId, initial, mode }: {
  restaurantId: string | null;
  initial: MenuPresentation;
  mode: "design" | "settings";
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoInput, setLogoInput] = useState(initial.logoUrl ?? "");

  function updateLink(key: keyof MenuPresentation["socialLinks"], entry: string) {
    setValue((current) => ({ ...current, socialLinks: { ...current.socialLinks, [key]: entry } }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurantId) return;
    setSaving(true);
    setSaved(false);
    const result = await saveMenuPresentationAction(restaurantId, { ...value, logoUrl: logoInput.trim() || null });
    setSaving(false);
    if (result) {
      setSaved(true);
      toast.success("Menu numérique enregistré.");
      window.setTimeout(() => setSaved(false), 2400);
    } else {
      toast.error("Enregistrement impossible. Vérifiez les liens et réessayez.");
    }
  }

  return (
    <div>
      <MenuStudioNav active={mode === "design" ? "Identité visuelle" : "Coordonnées"} />
      <PageHeader eyebrow="Flow Direct" title={mode === "design" ? "Identité du menu" : "Coordonnées et réseaux"}
        description={mode === "design" ? "Prévisualisez le menu de votre restaurant et publiez ses couleurs et sa typographie." : "Choisissez les moyens de contact qui apparaîtront sur le menu public."}
        action={<Button type="submit" form="presentation-form" disabled={saving || !restaurantId}>{saved ? <Check size={15} /> : null}{saving ? "Enregistrement…" : saved ? "Enregistré" : "Publier les changements"}</Button>} />
      {!restaurantId ? <Card className="p-6 text-sm text-mv-ink-soft">Sélectionnez un restaurant pour configurer son menu.</Card> : (
        <form id="presentation-form" onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {mode === "design" ? <>
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-mv-ink">Palette de couleurs</h2>
                <p className="mt-1 text-[12.5px] text-mv-ink-faint">Ces réglages modifient l’aperçu public du menu.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {palettes.map((palette) => {
                    const active = value.backgroundColor === palette.backgroundColor && value.accentColor === palette.accentColor;
                    return <button key={palette.name} type="button" onClick={() => setValue((v) => ({ ...v, ...palette }))}
                      aria-pressed={active} className={`rounded-xl border p-2 text-left ${active ? "border-mv-green ring-2 ring-mv-green/20" : "border-mv-border-soft"}`}>
                      <span className="flex h-8 overflow-hidden rounded-lg border border-black/5"><span className="flex-1" style={{ background: palette.backgroundColor }} /><span className="flex-1" style={{ background: palette.accentColor }} /><span className="flex-1" style={{ background: palette.textColor }} /></span>
                      <span className="mt-2 block text-[11.5px] font-medium text-mv-ink">{palette.name}</span>
                    </button>;
                  })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {([["backgroundColor", "Fond"], ["accentColor", "Accent"], ["textColor", "Texte"]] as const).map(([key, label]) => <Field key={key} label={label}><div className="flex gap-2"><input type="color" value={value[key]} onChange={(e) => setValue((v) => ({ ...v, [key]: e.target.value }))} className="h-10 w-12 cursor-pointer rounded border border-mv-border bg-white p-1" aria-label={label} /><Input value={value[key]} onChange={(e) => setValue((v) => ({ ...v, [key]: e.target.value }))} pattern="#[0-9a-fA-F]{6}" /></div></Field>)}
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-mv-ink">Typographie et logo</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Police"><select value={value.fontFamily} onChange={(e) => setValue((v) => ({ ...v, fontFamily: e.target.value as MenuPresentation["fontFamily"] }))} className="h-10 w-full rounded-xl border border-mv-border bg-mv-surface px-3 text-sm"><option>Plus Jakarta Sans</option><option>Inter</option><option>Georgia</option><option>Arial</option></select></Field>
                  <Field label="URL du logo" hint="Lien d’image https — facultatif"><Input type="url" value={logoInput} onChange={(e) => setLogoInput(e.target.value)} placeholder="https://…/logo.png" /></Field>
                </div>
              </Card>
            </> : <Card className="p-5">
              <h2 className="font-display text-lg font-semibold text-mv-ink">Liens affichés aux clients</h2>
              <p className="mt-1 text-[12.5px] text-mv-ink-faint">Laissez un champ vide pour ne pas l’afficher. Les liens personnels ne sont jamais publiés sans action de votre part.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {contactFields.map(([key, label, Icon, placeholder]) => <Field key={key} label={label}><div className="relative"><Icon size={14} className="pointer-events-none absolute left-3 top-3 text-mv-ink-faint" /><Input className="pl-9" type={key === "email" ? "email" : key === "phone" ? "tel" : "url"} value={value.socialLinks[key]} onChange={(e) => updateLink(key, e.target.value)} placeholder={placeholder} /></div></Field>)}
              </div>
            </Card>}
          </div>
          <aside className="xl:sticky xl:top-5 xl:self-start">
            <Card className="overflow-hidden border-0 p-0 shadow-mv-md">
              <div className="min-h-[520px] p-6" style={{ backgroundColor: value.backgroundColor, color: value.textColor, fontFamily: value.fontFamily }}>
                {logoInput && <Image src={logoInput} alt="Logo du restaurant" width={128} height={48} unoptimized className="mx-auto mb-4 h-12 max-w-32 object-contain" />}
                <p className="text-center text-2xl font-semibold">Votre restaurant</p>
                <div className="mt-8 space-y-5">
                  {["Menu", "Boissons", "À découvrir"].map((category) => <section key={category}><h3 className="mb-2 text-lg font-semibold" style={{ color: value.accentColor }}>{category}</h3><div className="flex justify-between gap-4"><span>Article du menu</span><span>12,00 $</span></div><p className="mt-1 text-sm opacity-65">Description et détails de l’article</p></section>)}
                </div>
                <div className="mt-8 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white" style={{ backgroundColor: value.accentColor }}>Commander</div>
                {mode === "settings" && <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs" style={{ color: value.accentColor }}>{contactFields.filter(([key]) => value.socialLinks[key]).map(([key, label]) => <span key={key}>{label}</span>)}</div>}
              </div>
            </Card>
            <p className="mt-2 text-center text-[11px] text-mv-ink-faint">Aperçu — seuls les éléments publiés seront visibles aux clients.</p>
          </aside>
        </form>
      )}
    </div>
  );
}
