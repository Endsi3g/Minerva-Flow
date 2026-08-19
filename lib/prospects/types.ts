import type { WebsiteAuditReport } from "./audit/types";
export type { AuditCheckId, AuditCheck, WebsiteAuditReport } from "./audit/types";

export type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten_free"
  | "halal"
  | "kosher"
  | "spicy"
  | "contains_nuts";

export type ModifierOption = {
  name: string;
  additionalPriceCents: number;
};

export type ModifierGroup = {
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
};

export type ProspectMenuItem = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  imageUrl?: string;
  inStock: boolean;
  dietaryTags: DietaryTag[];
  modifierGroups: ModifierGroup[];
};

export type ProspectMenuCategory = {
  id: string;
  name: string;
  description?: string;
  items: ProspectMenuItem[];
};

export type ProspectMenu = {
  categories: ProspectMenuCategory[];
};

export type ProspectSourcePlatform =
  | "uber_eats"
  | "doordash"
  | "skipthedishes"
  | "direct_website"
  | "raw_text"
  | "other";

export type ProspectStatus = "draft" | "ready" | "contacte" | "converti" | "decline";

export type Prospect = {
  id: string;
  sourceUrl: string;
  sourcePlatform: ProspectSourcePlatform;
  restaurantName: string;
  currency: string;
  detectedAddress: string | null;
  commissionRatePct: number;
  assumedMonthlyOrders: number;
  status: ProspectStatus;
  demoSlug: string | null;
  menu: ProspectMenu;
  notes: string | null;
  demoViewCount: number;
  lastViewedAt: string | null;
  contactedAt: string | null;
  auditReport: WebsiteAuditReport | null;
  auditGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
