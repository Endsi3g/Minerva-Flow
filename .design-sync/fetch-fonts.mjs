// One-off: source the real brand fonts (self-hosted via next/font/google in
// the app, so design-sync's static scrape can't see them) directly from
// Google Fonts — same OFL-licensed families/files next/font itself
// downloads, just fetched here instead of at Next's build time. Writes
// fonts/*.woff2 + a @font-face stylesheet defining the CSS custom
// properties components/ui reference (--font-heading, --font-jakarta,
// --font-sans, --font-fraunces).
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(".design-sync/fonts");
mkdirSync(OUT_DIR, { recursive: true });

const FAMILIES = [
  { css: "Playfair+Display:wght@500;600;700", varName: "--font-heading", family: "Playfair Display", fallback: "serif" },
  { css: "Plus+Jakarta+Sans:wght@400;500;600;700;800", varName: "--font-jakarta", family: "Plus Jakarta Sans", fallback: "ui-sans-serif, system-ui, sans-serif" },
  { css: "Inter:wght@400;500;600;700", varName: "--font-sans", family: "Inter", fallback: "ui-sans-serif, system-ui, sans-serif" },
  { css: "Fraunces:wght@400;500;600", varName: "--font-fraunces", family: "Fraunces", fallback: "serif" },
];

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

let combinedCss = "";
for (const f of FAMILIES) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${f.css}&display=swap`;
  const cssRes = await fetch(cssUrl, { headers: { "User-Agent": UA } });
  const css = await cssRes.text();
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
  let rewritten = css;
  let i = 0;
  for (const url of urls) {
    const fname = `${f.family.replace(/\s+/g, "-").toLowerCase()}-${i++}.woff2`;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(resolve(OUT_DIR, fname), buf);
    rewritten = rewritten.replace(url, `./${fname}`);
  }
  combinedCss += `/* ${f.family} */\n${rewritten}\n`;
  console.error(`  ${f.family}: ${urls.length} woff2 file(s)`);
}

// NOTE: the design-sync build only extracts @font-face rules from
// cfg.extraFonts CSS (everything else, incl. a :root block, is stripped on
// copy) — the --font-* custom property overrides live in compile-css.mjs's
// output instead, appended to the cssEntry file where they survive intact.
writeFileSync(resolve(OUT_DIR, "fonts.css"), combinedCss);
console.error(`wrote ${resolve(OUT_DIR, "fonts.css")}`);
