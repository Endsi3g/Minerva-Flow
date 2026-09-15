import type { WorkspaceBranding } from "@/lib/branding/workspace-branding";

/**
 * `x-forwarded-host` may contain a proxy chain. Only the first client-facing
 * host is relevant, and ports/trailing dots must not affect domain matching.
 */
export function normalizeRequestHost(value: string | null | undefined): string | null {
  const firstValue = value?.split(",")[0]?.trim().toLowerCase();
  if (!firstValue) return null;

  const withoutPort = firstValue.replace(/:\d+$/, "").replace(/\.$/, "");
  const hostname = withoutPort.replace(/^www\./, "");
  const pattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  return pattern.test(hostname) ? hostname : null;
}

function isPlatformHost(host: string | null): boolean {
  return Boolean(
    host &&
      (host === "localhost" ||
        host === "127.0.0.1" ||
        host === "minervaflow.app" ||
        host.endsWith(".minervaflow.app") ||
        host.endsWith(".vercel.app"))
  );
}

/**
 * A custom host is trusted only after DNS verification and only for the
 * currently selected workspace. This prevents a forged Host header from
 * changing a logged-in user’s brand context.
 */
export function brandingForRequestHost(
  branding: WorkspaceBranding | null,
  host: string | null | undefined
): WorkspaceBranding | null {
  if (!branding) return null;
  const normalizedHost = normalizeRequestHost(host);
  const configuredHost = normalizeRequestHost(branding.requestedCustomDomain);

  if (!configuredHost || branding.customDomainStatus !== "verifie" || !normalizedHost || isPlatformHost(normalizedHost)) {
    return branding;
  }
  return normalizedHost === configuredHost ? branding : null;
}
