/** Turns a restaurant name into a URL-safe base for the demo slug. */
export function slugifyRestaurantName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "resto";
}

/** Appends a short random suffix so two prospects with the same name never collide. */
export function generateDemoSlug(name: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugifyRestaurantName(name)}-${suffix}`;
}
