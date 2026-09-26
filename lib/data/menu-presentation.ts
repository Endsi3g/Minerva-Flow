import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MENU_PRESENTATION, type MenuPresentation } from "@/lib/types";

const COLOR = /^#[0-9a-f]{6}$/i;
const FONTS = new Set<MenuPresentation["fontFamily"]>(["Plus Jakarta Sans", "Inter", "Georgia", "Arial"]);
const LINKS = ["instagram", "facebook", "tiktok", "whatsapp", "email", "phone", "website"] as const;

function cleanValue(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeMenuPresentation(value: unknown): MenuPresentation {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawLinks = raw.socialLinks && typeof raw.socialLinks === "object"
    ? raw.socialLinks as Record<string, unknown>
    : {};
  const fontFamily = typeof raw.fontFamily === "string" && FONTS.has(raw.fontFamily as MenuPresentation["fontFamily"])
    ? raw.fontFamily as MenuPresentation["fontFamily"]
    : DEFAULT_MENU_PRESENTATION.fontFamily;
  return {
    backgroundColor: typeof raw.backgroundColor === "string" && COLOR.test(raw.backgroundColor)
      ? raw.backgroundColor.toLowerCase() : DEFAULT_MENU_PRESENTATION.backgroundColor,
    accentColor: typeof raw.accentColor === "string" && COLOR.test(raw.accentColor)
      ? raw.accentColor.toLowerCase() : DEFAULT_MENU_PRESENTATION.accentColor,
    textColor: typeof raw.textColor === "string" && COLOR.test(raw.textColor)
      ? raw.textColor.toLowerCase() : DEFAULT_MENU_PRESENTATION.textColor,
    fontFamily,
    logoUrl: cleanValue(raw.logoUrl, 1000) || null,
    socialLinks: Object.fromEntries(LINKS.map((key) => [key, cleanValue(rawLinks[key])])) as MenuPresentation["socialLinks"],
  };
}

export function validateMenuPresentation(value: unknown): MenuPresentation | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const links = raw.socialLinks && typeof raw.socialLinks === "object"
    ? raw.socialLinks as Record<string, unknown> : {};
  for (const key of ["instagram", "facebook", "tiktok", "whatsapp", "website"] as const) {
    const entry = cleanValue(links[key]);
    if (!entry) continue;
    try {
      const parsed = new URL(key === "instagram" && !entry.startsWith("http") ? `https://instagram.com/${entry.replace(/^@/, "")}` : entry);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    } catch { return null; }
  }
  const email = cleanValue(links.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const phone = cleanValue(links.phone);
  if (phone && !/^[+()\d .-]{7,30}$/.test(phone)) return null;
  return normalizeMenuPresentation(value);
}

export async function getMenuPresentation(restaurantId: string): Promise<MenuPresentation> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("restaurants").select("menu_presentation")
    .eq("id", restaurantId).maybeSingle();
  if (error || !data) return DEFAULT_MENU_PRESENTATION;
  return normalizeMenuPresentation((data as { menu_presentation: unknown }).menu_presentation);
}

export async function getPublicMenuPresentation(restaurantId: string): Promise<MenuPresentation> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("restaurants").select("menu_presentation, phone, website, address")
    .eq("id", restaurantId).maybeSingle();
  if (error || !data) return DEFAULT_MENU_PRESENTATION;
  const row = data as { menu_presentation: unknown; phone: string | null; website: string | null; address: string | null };
  const presentation = normalizeMenuPresentation(row.menu_presentation);
  return normalizeMenuPresentation({
    ...presentation,
    socialLinks: {
      ...presentation.socialLinks,
      phone: presentation.socialLinks.phone || row.phone || "",
      website: presentation.socialLinks.website || row.website || "",
    },
    logoUrl: presentation.logoUrl,
  });
}
