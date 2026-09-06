// One-off generator for the Capacitor icon/splash source images, run via
// `node capacitor/assets/_generate-sources.mjs`. Not part of the app build —
// @capacitor/assets consumes its output (icon.png, splash.png) to produce
// every platform-specific size, then this script's job is done.
import sharp from "sharp";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const sourceLogo = path.join(root, "public/icon-512.png");
const outDir = import.meta.dirname;

const EMERALD = "#167f5b";
const CREAM = "#f5f1e6";

async function main() {
  // App icon: the source PNG has its rounded corners and a background
  // gradient baked in, at a fixed radius-to-size ratio — iOS/Android apply
  // their own corner mask, so a source with pre-rounded corners would show
  // a visible seam once re-masked. Scaling up 40% and cropping back to the
  // original frame pushes those transparent corners entirely outside the
  // visible area (radius is proportional to size, so this holds for any
  // source size) without visibly cropping the mark, which sits well inside
  // the safe area already.
  const scaled = await sharp(sourceLogo)
    .resize(718, 718, { fit: "fill" })
    .extract({ left: (718 - 512) / 2, top: (718 - 512) / 2, width: 512, height: 512 })
    .toBuffer();

  await sharp(scaled)
    .resize(1024, 1024)
    .flatten({ background: EMERALD })
    .toFile(path.join(outDir, "icon.png"));

  // Splash: brand cream background, logo mark centered at a modest size —
  // @capacitor/assets crops/scales this per-platform.
  const mark = await sharp(sourceLogo)
    .resize(640, 640, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: CREAM },
  })
    .composite([{ input: mark, gravity: "center" }])
    .flatten({ background: CREAM })
    .toFile(path.join(outDir, "splash.png"));

  console.log("Wrote", path.join(outDir, "icon.png"), "and", path.join(outDir, "splash.png"));
}

main();
