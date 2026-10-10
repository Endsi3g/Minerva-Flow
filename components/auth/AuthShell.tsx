"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import React, { Component, useState, useEffect, type ReactNode } from "react";

const GrainGradient = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.GrainGradient),
  { ssr: false }
);

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ShaderErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Gracefully catch WebGL unsupported / context creation crashes without polluting PostHog
    console.warn("[ShaderErrorBoundary] WebGL shader unavailable, using CSS fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function CssGradientFallback() {
  return (
    <div
      className="absolute inset-0 bg-mv-green-tint"
      aria-hidden="true"
      style={{
        background:
          "radial-gradient(ellipse at 85% 15%, rgba(223, 255, 95, 0.45) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(22, 127, 91, 0.35) 0%, transparent 60%), linear-gradient(135deg, #f5f1e6 0%, #dcece3 50%, #eef5f0 100%)",
      }}
    />
  );
}

function SafeGrainGradient() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(checkWebGLSupport());
  }, []);

  if (supported === false || supported === null) {
    return <CssGradientFallback />;
  }

  return (
    <ShaderErrorBoundary fallback={<CssGradientFallback />}>
      <GrainGradient
        speed={0.6}
        scale={1}
        rotation={0}
        offsetX={0}
        offsetY={0}
        softness={0.75}
        intensity={0.45}
        noise={0.06}
        shape="corners"
        frame={1200}
        colors={["#f5f1e6", "#dcece3", "#dfff5f", "#167f5b"]}
        colorBack="#eef5f000"
        className="absolute inset-0"
      />
    </ShaderErrorBoundary>
  );
}
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shell/Logo";
import { StepIndicator } from "@/components/ui/onboarding";
import { cn } from "@/lib/utils";

export type AuthStep = { current: number; total: number; label: string };

/**
 * Shared split-panel shell for every auth/onboarding screen (login, sign-up,
 * onboarding, forgot/update password) — one continuous visual identity so
 * moving from "create your account" to "set up your restaurant" never feels
 * like switching apps. The step indicator (when present) is what makes the
 * signup→onboarding hop read as ONE flow even though they're two routes.
 */
export function AuthShell({
  step,
  panelKey,
  panelHeadline,
  panelSubline,
  panelPoints,
  children,
  footer,
  cardClassName,
}: {
  step?: AuthStep;
  /** When set, the panel content crossfades whenever this value changes
   * (e.g. the caller's login/signup mode) instead of snapping instantly —
   * the reciprocal half of the form-side transition. Omit for screens whose
   * panel content never changes in place. */
  panelKey?: string;
  panelHeadline: ReactNode;
  panelSubline?: string;
  panelPoints?: { title: string; description: string }[];
  children: ReactNode;
  footer?: ReactNode;
  cardClassName?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-mv-cream p-3 text-mv-ink antialiased sm:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1400px] gap-5 lg:grid-cols-[1fr_0.92fr] lg:gap-6">
        {/* ── Form side ── */}
        <div className="flex min-h-[640px] flex-col justify-center rounded-3xl border border-mv-border bg-mv-surface px-6 py-10 shadow-mv-lg sm:px-10 sm:py-14 lg:min-h-0 lg:px-16">
          <div className={cn("mx-auto w-full max-w-[420px]", cardClassName)}>
            <Link href="/overview" className="mb-7 inline-flex items-center">
              <Logo size={34} />
            </Link>

            {step && (
              <div className="mb-6 flex items-center gap-3">
                <StepIndicator currentStep={step.current} totalSteps={step.total} variant="pills" className="max-w-[88px] flex-1 justify-start" />
                <span className="font-mono text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                  Étape {step.current} / {step.total} · {step.label}
                </span>
              </div>
            )}

            {children}
          </div>

          {footer && <div className="mx-auto mt-8 w-full max-w-[420px]">{footer}</div>}
        </div>

        {/* ── Visual side: light grain-gradient panel, mv-green/mv-lime tones ── */}
        <div className="relative hidden min-h-[640px] overflow-hidden rounded-3xl border border-mv-border bg-mv-green-tint lg:flex lg:min-h-0">
          <SafeGrainGradient />
          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-14">
            <div />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={panelKey ?? "static"}
                initial={panelKey ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <h2 className="max-w-[480px] font-display text-[34px] font-medium leading-[1.08] tracking-[-0.02em] text-mv-green-darker xl:text-[42px]">
                  {panelHeadline}
                </h2>
                {panelSubline && (
                  <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-mv-ink-soft">{panelSubline}</p>
                )}
                {panelPoints && (
                  <div className="mt-8 space-y-4">
                    {panelPoints.map((p) => (
                      <div key={p.title} className="rounded-2xl border border-mv-green-dark/15 bg-mv-surface/70 p-4 backdrop-blur-sm">
                        <p className="font-display text-[14.5px] font-medium text-mv-ink">{p.title}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
