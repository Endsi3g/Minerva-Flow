const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

export function getDemoUrl(slug: string): string {
  return `${APP_ORIGIN}/demo/${slug}`;
}
