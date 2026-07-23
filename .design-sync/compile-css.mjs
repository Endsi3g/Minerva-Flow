// One-off: compile app/globals.css through the repo's real Tailwind v4
// PostCSS pipeline so design-sync ships actual utility CSS instead of the
// unresolved `@import "tailwindcss"` source. Regenerate before every build
// (cfg.buildCmd) since Tailwind v4 scans the live source tree for classes.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";

const src = resolve("app/globals.css");
const out = resolve(".design-sync/.cache/compiled-tailwind.css");
mkdirSync(dirname(out), { recursive: true });

const css = readFileSync(src, "utf8");
const result = await postcss([tailwindPostcss({ base: process.cwd() })]).process(css, {
  from: src,
  to: out,
});

// app/globals.css declares brand fonts as passthrough `--font-x: var(--font-x)`
// (next/font injects the real value at runtime via a className on <html>,
// which the design-sync bundle has no equivalent for) inside `@layer theme`.
// Real values (sourced by fetch-fonts.mjs into .design-sync/fonts/fonts.css,
// wired via cfg.extraFonts) are appended here, unlayered, so they win the
// cascade — per the CSS cascade-layers spec, unlayered normal declarations
// always beat layered ones regardless of source order.
const fontOverrides = `
:root {
  --font-heading: 'Playfair Display', serif;
  --font-jakarta: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-fraunces: 'Fraunces', serif;
}
`;

writeFileSync(out, result.css + fontOverrides);
console.error(`compiled ${result.css.length} bytes -> ${out}`);
