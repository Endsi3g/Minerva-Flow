/**
 * Minerva Flow — Design System Tokens
 * Source of truth for brand colors, typography, elevations, spacing, and animations.
 */

export const colors = {
  // Brand Olive/Forest Green
  green: {
    DEFAULT: "#167f5b",
    dark: "#0e5a40",
    darker: "#0a4531",
    light: "#dcece3",
    tint: "#eef5f0",
  },
  // High-Voltage Lime Accent
  lime: {
    DEFAULT: "#dfff5f",
    dark: "#6d7e1f",
    tint: "#f4ffdc",
  },
  // Warm Editorial Cream Surfaces
  cream: {
    DEFAULT: "#f5f1e6",
    soft: "#fbf9f3",
    surface: "#fffefa",
  },
  // Typography Ink Palette
  ink: {
    DEFAULT: "#1a1e16",
    soft: "#565f52",
    faint: "#8d9488",
    mute: "#b3b8a9",
  },
  // Architectural Borders
  border: {
    DEFAULT: "#e6e0d0",
    soft: "#eee9db",
  },
  // Status & Feedback
  status: {
    red: {
      DEFAULT: "#b5473a",
      bg: "#f8ece8",
      dark: "#e07a6a",
      darkBg: "#3a1f1c",
    },
    amber: {
      DEFAULT: "#ab7d1f",
      bg: "#f6efd9",
      dark: "#d9ab52",
      darkBg: "#3a3018",
    },
    green: {
      DEFAULT: "#167f5b",
      bg: "#eef5f0",
      dark: "#1c9a6f",
      darkBg: "#12241c",
    },
    blue: {
      DEFAULT: "#2563eb",
      bg: "#eff6ff",
      dark: "#60a5fa",
      darkBg: "#1e293b",
    },
    purple: {
      DEFAULT: "#7c3aed",
      bg: "#f5f3ff",
      dark: "#a78bfa",
      darkBg: "#2e1065",
    },
  },
  // Revenue-intensity heatmap scale
  heatmap: {
    1: "#ede7d6",
    2: "#c7e1d0",
    3: "#8fc7a9",
    4: "#4da37e",
    5: "#167f5b",
  },
} as const;

export const typography = {
  fonts: {
    heading: '"New York", -apple-system-serif, ui-serif, Georgia, "Playfair Display", serif',
    body: 'var(--font-jakarta), "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    mono: 'var(--font-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  sizes: {
    xs: { fontSize: "0.75rem", lineHeight: "1rem" },
    sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },
    base: { fontSize: "1rem", lineHeight: "1.5rem" },
    lg: { fontSize: "1.125rem", lineHeight: "1.75rem" },
    xl: { fontSize: "1.25rem", lineHeight: "1.75rem" },
    "2xl": { fontSize: "1.5rem", lineHeight: "2rem" },
    "3xl": { fontSize: "1.875rem", lineHeight: "2.25rem" },
    "4xl": { fontSize: "2.25rem", lineHeight: "2.5rem" },
    "5xl": { fontSize: "3rem", lineHeight: "1.16" },
  },
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(26, 30, 22, 0.05)",
  md: "0 2px 4px rgba(26, 30, 22, 0.04), 0 8px 20px rgba(26, 30, 22, 0.06)",
  lg: "0 8px 16px rgba(26, 30, 22, 0.06), 0 24px 48px rgba(26, 30, 22, 0.10)",
} as const;

export const radii = {
  sm: "calc(var(--radius, 0.625rem) * 0.6)",
  md: "calc(var(--radius, 0.625rem) * 0.8)",
  lg: "var(--radius, 0.625rem)",
  xl: "calc(var(--radius, 0.625rem) * 1.4)",
  "2xl": "calc(var(--radius, 0.625rem) * 1.8)",
  "3xl": "calc(var(--radius, 0.625rem) * 2.2)",
  full: "9999px",
} as const;

export const animations = {
  fadeUp: "mv-animate-in",
  skeleton: "mv-skeleton",
  leafBreathe: "mv-leaf-breathe",
  checkPop: "mv-check-pop",
  scaleIn: "mv-scale-in",
} as const;

export type DesignSystemTokens = {
  colors: typeof colors;
  typography: typeof typography;
  shadows: typeof shadows;
  radii: typeof radii;
  animations: typeof animations;
};
