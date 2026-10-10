import "server-only";

const REPO = "Endsi3g/Minerva-Flow";

export const DESKTOP_RELEASES_URL = `https://github.com/${REPO}/releases`;

type Asset = { name: string; browser_download_url: string; digest?: string | null };
type Release = { tag_name: string; draft: boolean; prerelease: boolean; assets: Asset[] };

export type DesktopRelease = {
  version: string;
  mac?: { url: string; sha256?: string };
  win?: { url: string; sha256?: string };
  updaterManifestUrl?: string;
};

function sha256Of(asset: Asset | undefined): string | undefined {
  const digest = asset?.digest;
  return digest && digest.startsWith("sha256:") ? digest.slice("sha256:".length) : undefined;
}

/** Latest PUBLISHED desktop release (drafts never reach the public). Cached for 10 minutes. */
export async function latestDesktopRelease(): Promise<DesktopRelease | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers, next: { revalidate: 600 } });
    if (!response.ok) return null;
    const releases = (await response.json()) as Release[];
    const release = releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith("desktop-v"));
    if (!release) return null;
    const dmg = release.assets.find((a) => a.name.endsWith(".dmg"));
    const exe = release.assets.find((a) => /-setup\.exe$/i.test(a.name)) ?? release.assets.find((a) => a.name.endsWith(".msi"));
    const manifest = release.assets.find((a) => a.name === "latest.json");
    if (!dmg && !exe) return null;
    return {
      version: release.tag_name.replace("desktop-v", ""),
      mac: dmg ? { url: dmg.browser_download_url, sha256: sha256Of(dmg) } : undefined,
      win: exe ? { url: exe.browser_download_url, sha256: sha256Of(exe) } : undefined,
      updaterManifestUrl: manifest?.browser_download_url,
    };
  } catch {
    return null;
  }
}
