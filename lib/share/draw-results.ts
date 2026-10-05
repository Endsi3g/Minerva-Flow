import { countUpValue, formatMetricValue, staggeredProgress, type ShareMetric } from "@/lib/share/results";

export type ShareTheme = {
  id: string;
  name: string;
  bgTop: string;
  bgBottom: string;
  text: string;
  muted: string;
  accent: string;
};

/** Brand palette (see AGENTS.md): emerald/forest and warm cream surfaces. */
export const SHARE_THEMES: ShareTheme[] = [
  { id: "forest", name: "Forêt", bgTop: "#167f5b", bgBottom: "#0e5a40", text: "#ffffff", muted: "rgba(255,255,255,0.78)", accent: "#fafaf5" },
  { id: "cream", name: "Crème", bgTop: "#fafaf5", bgBottom: "#f5f1e6", text: "#1b2620", muted: "#56645a", accent: "#167f5b" },
  { id: "night", name: "Nuit", bgTop: "#14170f", bgBottom: "#1f2418", text: "#f3f2ea", muted: "#b9c0b0", accent: "#4ade9b" },
];

export type ShareFormat = { id: "story" | "square"; label: string; width: number; height: number };

export const SHARE_FORMATS: ShareFormat[] = [
  { id: "story", label: "Story (9:16)", width: 1080, height: 1920 },
  { id: "square", label: "Publication (1:1)", width: 1080, height: 1080 },
];

export type ShareSpec = {
  width: number;
  height: number;
  theme: ShareTheme;
  headline: string;
  subtitle: string;
  metrics: ShareMetric[];
  /** Brand line at the bottom; null removes it. */
  footer: string | null;
};

export type MetricRow = { centerY: number; numberSize: number; labelSize: number };

/**
 * Evenly spaces `count` metric blocks between the header and the footer.
 * Sizes shrink as rows get more numerous so nothing overflows a square card.
 */
export function layoutMetricRows(count: number, height: number, headerBottom: number, footerHeight: number): MetricRow[] {
  if (count <= 0) return [];
  const top = headerBottom;
  const bottom = height - footerHeight;
  const slot = (bottom - top) / count;
  const numberSize = Math.max(64, Math.min(168, Math.floor(slot * 0.52)));
  const labelSize = Math.max(26, Math.min(40, Math.floor(slot * 0.17)));
  return Array.from({ length: count }, (_, index) => ({
    centerY: top + slot * index + slot / 2,
    numberSize,
    labelSize,
  }));
}

const SERIF = '"New York", "Playfair Display", Georgia, serif';
const SANS = '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws one frame. `t` is 0..1 animation progress; t = 1 is the final,
 * exact-values frame used for the PNG export and the video's last seconds.
 */
export function drawResultsFrame(ctx: CanvasRenderingContext2D, spec: ShareSpec, t: number): void {
  const { width, height, theme } = spec;
  const margin = Math.round(width * 0.09);
  const maxTextWidth = width - margin * 2;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, theme.bgTop);
  gradient.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const headlineSize = Math.round(width * (height > width ? 0.082 : 0.07));
  ctx.font = `600 ${headlineSize}px ${SERIF}`;
  const headlineLines = wrapLines(ctx, spec.headline, maxTextWidth).slice(0, 3);
  let cursorY = Math.round(height * (height > width ? 0.12 : 0.1));

  const headerAlpha = Math.min(1, t * 4);
  ctx.globalAlpha = headerAlpha;
  ctx.fillStyle = theme.text;
  for (const line of headlineLines) {
    ctx.fillText(line, margin, cursorY);
    cursorY += Math.round(headlineSize * 1.15);
  }

  if (spec.subtitle) {
    const subtitleSize = Math.round(width * 0.036);
    ctx.font = `500 ${subtitleSize}px ${SANS}`;
    ctx.fillStyle = theme.muted;
    cursorY += Math.round(subtitleSize * 0.2);
    for (const line of wrapLines(ctx, spec.subtitle, maxTextWidth).slice(0, 2)) {
      ctx.fillText(line, margin, cursorY);
      cursorY += Math.round(subtitleSize * 1.4);
    }
  }
  ctx.globalAlpha = 1;

  const footerHeight = spec.footer ? Math.round(height * 0.09) : Math.round(height * 0.04);
  const rows = layoutMetricRows(spec.metrics.length, height, cursorY + Math.round(height * 0.03), footerHeight);

  spec.metrics.forEach((metric, index) => {
    const row = rows[index];
    const progress = staggeredProgress(t, index, spec.metrics.length);
    const value = formatMetricValue(metric, countUpValue(metric, progress));

    ctx.globalAlpha = Math.min(1, progress * 3);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(margin, row.centerY - row.numberSize * 0.62, Math.round(width * 0.012), row.numberSize * 1.3);

    const textX = margin + Math.round(width * 0.04);
    ctx.fillStyle = theme.text;
    ctx.font = `700 ${row.numberSize}px ${SANS}`;
    ctx.fillText(value, textX, row.centerY + row.numberSize * 0.2);

    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${row.labelSize}px ${SANS}`;
    const labelLines = wrapLines(ctx, metric.label, width - textX - margin).slice(0, 2);
    labelLines.forEach((line, lineIndex) => {
      ctx.fillText(line, textX, row.centerY + row.numberSize * 0.2 + row.labelSize * 1.5 * (lineIndex + 1));
    });
  });
  ctx.globalAlpha = 1;

  if (spec.footer) {
    ctx.fillStyle = theme.muted;
    ctx.font = `600 ${Math.round(width * 0.03)}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText(spec.footer, width / 2, height - Math.round(footerHeight * 0.4));
    ctx.textAlign = "left";
  }
}
