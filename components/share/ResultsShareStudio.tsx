"use client";


import { intlLocale } from "@/lib/format-locale";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Download, Film, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { cn } from "@/lib/utils";
import { drawResultsFrame, SHARE_FORMATS, SHARE_THEMES, type ShareSpec } from "@/lib/share/draw-results";
import { pickVideoType, recordCanvasVideo } from "@/lib/share/record-video";
import type { ShareMetric } from "@/lib/share/results";

const BRAND_FOOTER = "Minerva Flow · minervaflow.app";

type Props = {
  metrics: ShareMetric[];
  defaultHeadline: string;
  defaultSubtitle: string;
  /** Used for download file names, e.g. "resultats-chez-marie". */
  fileBase: string;
  emptyTitle: string;
  emptyHint: string;
};

function fileFromBlob(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}

export function ResultsShareStudio({ metrics, defaultHeadline, defaultSubtitle, fileBase, emptyTitle, emptyHint }: Props) {
  const tv = useTranslations("resultsShareStudio");
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formatId, setFormatId] = useState(SHARE_FORMATS[0].id);
  const [themeId, setThemeId] = useState(SHARE_THEMES[0].id);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(metrics.map((m) => m.key)));
  const [headline, setHeadline] = useState(defaultHeadline);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [showFooter, setShowFooter] = useState(true);
  const [busy, setBusy] = useState<null | "png" | "video" | "share">(null);
  const [fontsReady, setFontsReady] = useState(false);
  // false on the server, real support on the client, without a hydration mismatch.
  const canRecord = useSyncExternalStore(
    () => () => {},
    () => pickVideoType() !== null,
    () => false
  );

  const format = SHARE_FORMATS.find((f) => f.id === formatId) ?? SHARE_FORMATS[0];
  const theme = SHARE_THEMES.find((t) => t.id === themeId) ?? SHARE_THEMES[0];
  const chosen = useMemo(() => metrics.filter((m) => selected.has(m.key)), [metrics, selected]);

  const spec: ShareSpec = useMemo(
    () => ({
      width: format.width,
      height: format.height,
      theme,
      headline: headline.trim() || defaultHeadline,
      subtitle: subtitle.trim(),
      metrics: chosen,
      footer: showFooter ? BRAND_FOOTER : null,
    }),
    [format, theme, headline, subtitle, chosen, showFooter, defaultHeadline]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await Promise.all([
          document.fonts.load('600 40px "Playfair Display"'),
          document.fonts.load('700 40px "Plus Jakarta Sans"'),
          document.fonts.load('500 40px "Plus Jakarta Sans"'),
        ]);
      } catch {
        // Fall back to system fonts; the card is still correct.
      }
      if (!cancelled) setFontsReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderAt = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      drawResultsFrame(ctx, spec, t);
    },
    [spec]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = spec.width;
    canvas.height = spec.height;
    renderAt(1);
  }, [spec, renderAt, fontsReady]);

  const toggleMetric = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const makePng = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    renderAt(1);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPng = async () => {
    setBusy("png");
    try {
      const blob = await makePng();
      if (!blob) throw new Error("png");
      triggerDownload(blob, `${fileBase}-${format.id}.png`);
    } catch {
      toast.error(tv("couldNotCreateThe"));
    } finally {
      setBusy(null);
    }
  };

  const downloadVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy("video");
    try {
      const video = await recordCanvasVideo(canvas, renderAt);
      renderAt(1);
      if (!video) throw new Error("unsupported");
      triggerDownload(video.blob, `${fileBase}-${format.id}.${video.extension}`);
    } catch {
      toast.error(tv("yourBrowserCannotCreate"));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      const blob = await makePng();
      if (!blob) throw new Error("png");
      const file = fileFromBlob(blob, `${fileBase}-${format.id}.png`);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: spec.headline });
      } else {
        triggerDownload(blob, file.name);
        toast.message(tv("directSharingIsUnavailable"));
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") toast.error(tv("sharingFailedTryAgain"));
    } finally {
      setBusy(null);
    }
  };

  if (metrics.length === 0) {
    return (
      <Card>
        <p className="text-[15px] font-semibold text-mv-ink">{emptyTitle}</p>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mv-ink-soft">{emptyHint}</p>
      </Card>
    );
  }

  const nothingSelected = chosen.length === 0;
  const previewWidth = format.id === "story" ? 270 : 360;
  const previewHeight = Math.round((previewWidth * format.height) / format.width);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <Card>
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-mv-ink">{tv("figuresToShow")}</legend>
            <p className="mb-3 text-[12px] text-mv-ink-faint">
              {tv("onlyRealFiguresAre")}
            </p>
            <div className="space-y-2">
              {metrics.map((metric) => (
                <label key={metric.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-mv-border bg-mv-surface px-3 py-2.5 text-[13px] text-mv-ink">
                  <input
                    type="checkbox"
                    checked={selected.has(metric.key)}
                    onChange={() => toggleMetric(metric.key)}
                    className="size-4 accent-[#167f5b]"
                  />
                  <span className="flex-1">{metric.label}</span>
                  <span className="font-semibold tabular-nums">
                    {metric.kind === "rating" ? metric.value.toFixed(1).replace(".", ",") + " ★" : metric.value.toLocaleString(intlLocale(locale))}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre">
              <Input value={headline} maxLength={80} onChange={(event) => setHeadline(event.target.value)} />
            </Field>
            <Field label="Sous-titre (facultatif)">
              <Input value={subtitle} maxLength={110} onChange={(event) => setSubtitle(event.target.value)} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-mv-ink">{tv("format")}</p>
              <div className="flex gap-2">
                {SHARE_FORMATS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormatId(option.id)}
                    aria-pressed={formatId === option.id}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors",
                      formatId === option.id ? "border-mv-green bg-mv-green/10 text-mv-green-dark" : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-mv-ink">{tv("colors")}</p>
              <div className="flex gap-2">
                {SHARE_THEMES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setThemeId(option.id)}
                    aria-pressed={themeId === option.id}
                    aria-label={tv("optionnameTheme", { optionName: option.name })}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors",
                      themeId === option.id ? "border-mv-green bg-mv-green/10 text-mv-green-dark" : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                    )}
                  >
                    <span className="size-3.5 rounded-full border border-black/10" style={{ background: option.bgTop }} aria-hidden="true" />
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[12.5px] text-mv-ink-soft">
            <input type="checkbox" checked={showFooter} onChange={(event) => setShowFooter(event.target.checked)} className="size-4 accent-[#167f5b]" />
            Afficher « {BRAND_FOOTER} » en bas du visuel
          </label>
        </Card>
      </div>

      <div className="space-y-3">
        <Card>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={tv("visualPreviewHeadlineMap", { headline: spec.headline, map: chosen.map((m) => m.label).join(", ") })}
              style={{ width: previewWidth, height: previewHeight }}
              className="rounded-xl border border-mv-border shadow-mv-sm"
            />
          </div>
          {nothingSelected && <p className="mt-3 text-center text-[12.5px] text-mv-ink-faint">{tv("checkAtLeastOne")}</p>}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={downloadPng} disabled={busy !== null || nothingSelected}>
            {busy === "png" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            Image PNG
          </Button>
          <Button variant="secondary" onClick={downloadVideo} disabled={busy !== null || nothingSelected || !canRecord}>
            {busy === "video" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Film size={15} aria-hidden="true" />}
            {tv("animatedVideo")}
          </Button>
        </div>
        <Button variant="outline" className="w-full" onClick={share} disabled={busy !== null || nothingSelected}>
          {busy === "share" ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
          Partager
        </Button>
        <p aria-live="polite" className="text-[12px] leading-relaxed text-mv-ink-faint">
          {busy === "video"
            ? tv("creatingTheVideoAbout")
            : canRecord
              ? tv("theVideoLastsAbout")
              : tv("theAnimatedVideoIs")}
        </p>
      </div>
    </div>
  );
}
