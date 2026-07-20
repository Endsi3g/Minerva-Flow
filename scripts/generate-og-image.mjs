// One-off generator for public/og.png (1200x630 Open Graph preview) — run
// with `node scripts/generate-og-image.mjs` whenever the logo or brand
// copy changes. Uses the real app icon (public/icon-512.png), not a
// redrawn approximation, composited over an SVG background matching the
// brand tokens in app/globals.css (--mv-cream, --mv-ink, --mv-green*).
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconPath = path.join(rootDir, "public/icon-512.png");
const outPath = path.join(rootDir, "public/og.png");

const WIDTH = 1200;
const HEIGHT = 630;
const ICON_SIZE = 168;

const CREAM = "#F5F1E6";
const INK = "#1A1E16";
const GREEN_DARK = "#0E5A40";
const INK_SOFT = "#565F52";

const background = Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${CREAM}" />
  <text x="${WIDTH / 2}" y="410" text-anchor="middle" xml:space="preserve"
        font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">
    <tspan fill="${INK}">Minerva&#160;</tspan><tspan fill="${GREEN_DARK}">Flow</tspan>
  </text>
  <text x="${WIDTH / 2}" y="460" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="28" fill="${INK_SOFT}">
    Le cockpit de revenus pour restaurants et cafés
  </text>
</svg>
`);

const icon = await sharp(iconPath).resize(ICON_SIZE, ICON_SIZE).toBuffer();

await sharp(background)
  .composite([{ input: icon, left: Math.round((WIDTH - ICON_SIZE) / 2), top: 150 }])
  .png()
  .toFile(outPath);

console.log(`Wrote ${outPath}`);
