"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { PipelineTracker, type PipelineStepState } from "./PipelineTracker";
import { QuickMenuEditor } from "./QuickMenuEditor";
import { OutboundHub } from "./OutboundHub";
import { WebsiteAudit } from "./WebsiteAudit";
import {
  createProspectAction,
  reparseProspectMenuAction,
  scrapeMenuAction,
  updateProspectMenuAction,
  updateProspectMetaAction,
  updateProspectStatusAction,
} from "./actions";
import type { Prospect, ProspectMenu, ProspectSourcePlatform, ProspectStatus } from "@/lib/prospects/types";
import { useRouter } from "@/i18n/navigation";
import { Zap, RefreshCw, Bot, X, CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function useMenuScraper() {
  const t = useTranslations("admin.prospects.ingestion");
  const [status, setStatus] = useState<"idle" | "scraping" | "done" | "error">("idle");
  const [menu, setMenu] = useState<ProspectMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function scrape(url: string, platform: ProspectSourcePlatform) {
    setStatus("scraping");
    setError(null);
    setMenu(null);

    const result = await scrapeMenuAction(url, platform);
    if ("error" in result) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("done");
    setMenu(result.menu);
    toast.success(t("scrapeSuccess", { count: result.menu.categories.flatMap((c) => c.items).length }));
  }

  function reset() {
    setStatus("idle");
    setMenu(null);
    setError(null);
  }

  return { status, menu, error, scrape, reset };
}

const PLATFORM_VALUES: ProspectSourcePlatform[] = [
  "uber_eats",
  "doordash",
  "skipthedishes",
  "direct_website",
  "raw_text",
  "other",
];
const CURRENCY_VALUES = ["CAD", "USD", "EUR"];

function usePipelineSteps() {
  const t = useTranslations("admin.prospects.pipeline");
  const labels = [t("stepRead"), t("stepStructure"), t("stepMargin"), t("stepInstance")];
  const [activeStep, setActiveStep] = useState(-1);

  const steps = labels.map((label, i) => ({
    label,
    state: (activeStep < 0 ? "pending" : i < activeStep ? "done" : i === activeStep ? "active" : "pending") as PipelineStepState,
  }));

  async function run() {
    for (let i = 0; i < labels.length; i++) {
      setActiveStep(i);
      await new Promise((r) => setTimeout(r, 450));
    }
    setActiveStep(labels.length);
  }

  return { steps, run, isRunning: activeStep >= 0 && activeStep < labels.length };
}

function IngestionFlow() {
  const t = useTranslations("admin.prospects.ingestion");
  const router = useRouter();
  const { steps, run, isRunning } = usePipelineSteps();
  const [started, setStarted] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState<ProspectSourcePlatform>("other");
  const scraper = useMenuScraper();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const restaurantName = String(form.get("restaurantName") ?? "").trim();
    if (!sourceUrl.trim() || !restaurantName) return;

    setStarted(true);
    const pipeline = run();

    const result = await createProspectAction({
      sourceUrl: sourceUrl.trim(),
      restaurantName,
      sourcePlatform,
      currency: String(form.get("currency") ?? "CAD"),
      detectedAddress: String(form.get("detectedAddress") ?? ""),
      commissionRatePct: Number(form.get("commissionRatePct") ?? 28),
      assumedMonthlyOrders: Number(form.get("assumedMonthlyOrders") ?? 300),
      pastedText: String(form.get("pastedText") ?? ""),
      scrapedMenu: scraper.menu ?? undefined,
      contactName: String(form.get("contactName") ?? ""),
    });

    await pipeline;

    if (result) {
      router.push(`/admin/prospects/${result.id}`);
    } else {
      toast.error(t("createFailed"));
      setStarted(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Field label={t("urlLabel")}>
            <Input
              name="sourceUrl"
              type="url"
              placeholder={t("urlPlaceholder")}
              required
              disabled={started}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={started} className="w-full sm:w-auto">
              <Zap data-icon="inline-start" size={14} />
              {isRunning ? t("generating") : t("generate")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("restaurantNameLabel")}>
            <Input name="restaurantName" placeholder={t("restaurantNamePlaceholder")} required disabled={started} />
          </Field>
          <Field label={t("platformLabel")}>
            <Select
              name="sourcePlatform"
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value as ProspectSourcePlatform)}
              disabled={started}
            >
              {PLATFORM_VALUES.map((p) => (
                <option key={p} value={p}>
                  {t(`platform.${p}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("currencyLabel")}>
            <Select name="currency" defaultValue="CAD" disabled={started}>
              {CURRENCY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("commissionLabel")}>
            <Input name="commissionRatePct" type="number" min="0" max="50" defaultValue="28" disabled={started} />
          </Field>
          <Field label={t("assumedOrdersLabel")}>
            <Input name="assumedMonthlyOrders" type="number" min="0" defaultValue="300" disabled={started} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("addressLabel")} hint={t("addressHint")}>
            <Input name="detectedAddress" placeholder={t("addressPlaceholder")} disabled={started} />
          </Field>
          <Field label={t("contactNameLabel")} hint={t("contactNameHint")}>
            <Input name="contactName" placeholder={t("contactNamePlaceholder")} disabled={started} />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-mv-ink-soft">{t("pastedTextLabel")}</span>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              disabled={started || !sourceUrl.trim() || scraper.status === "scraping"}
              onClick={() => scraper.scrape(sourceUrl.trim(), sourcePlatform)}
            >
              <Bot data-icon="inline-start" size={12} />
              {scraper.status === "scraping" ? t("scraping") : t("scrapeAuto")}
            </Button>
          </div>

          {scraper.status === "done" && scraper.menu && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-mv-green/30 bg-mv-green-tint px-3 py-2 text-[12px] text-mv-green-dark">
              <span className="flex items-center gap-1.5">
                <CircleCheck size={13} />
                {t("scrapeFoundItems", {
                  count: scraper.menu.categories.flatMap((c) => c.items).length,
                })}
              </span>
              <button type="button" onClick={scraper.reset} title={t("scrapeClear")}>
                <X size={13} />
              </button>
            </div>
          )}
          {scraper.status === "error" && (
            <p className="mb-2 text-[12px] text-mv-red">{scraper.error}</p>
          )}

          <Textarea
            name="pastedText"
            rows={6}
            placeholder={t("pastedTextPlaceholder")}
            disabled={started || scraper.status === "done"}
          />
          <p className="mt-1 text-[12px] text-mv-ink-faint">{t("pastedTextHint")}</p>
        </div>
      </form>

      {started && <PipelineTracker steps={steps} />}
    </div>
  );
}

function ReingestPanel({ prospectId }: { prospectId: string }) {
  const t = useTranslations("admin.prospects.ingestion");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReparse() {
    setIsSubmitting(true);
    try {
      const ok = await reparseProspectMenuAction(prospectId, text);
      if (ok) {
        toast.success(t("reparseSuccess"));
        setOpen(false);
        window.location.reload();
      } else {
        toast.error(t("reparseFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <RefreshCw data-icon="inline-start" size={13} />
        {t("reingest")}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
      <Field label={t("pastedTextLabel")} hint={t("reingestHint")}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={t("pastedTextPlaceholder")} />
      </Field>
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={handleReparse} disabled={isSubmitting}>
          {isSubmitting ? t("reparsing") : t("reparseConfirm")}
        </Button>
      </div>
    </div>
  );
}

function ProspectEditor({ prospect }: { prospect: Prospect }) {
  const tPipeline = useTranslations("admin.prospects.pipeline");
  const doneSteps: PipelineStepState[] = ["done", "done", "done", "done"];
  const pipelineLabels = [
    tPipeline("stepRead"),
    tPipeline("stepStructure"),
    tPipeline("stepMargin"),
    tPipeline("stepInstance"),
  ];

  async function handleMenuSave(menu: ProspectMenu) {
    return updateProspectMenuAction(prospect.id, menu);
  }

  async function handleStatusChange(status: ProspectStatus) {
    return updateProspectStatusAction(prospect.id, status);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PipelineTracker steps={pipelineLabels.map((label, i) => ({ label, state: doneSteps[i] }))} />
        <ReingestPanel prospectId={prospect.id} />
      </div>

      <ProspectMetaCard prospect={prospect} />

      <WebsiteAudit
        prospectId={prospect.id}
        sourceUrl={prospect.sourceUrl}
        initialReport={prospect.auditReport}
        initialGeneratedAt={prospect.auditGeneratedAt}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <QuickMenuEditor menu={prospect.menu} onSave={handleMenuSave} />
        <OutboundHub prospect={prospect} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}

function ProspectMetaCard({ prospect }: { prospect: Prospect }) {
  const t = useTranslations("admin.prospects.editor");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSaving(true);
    try {
      const ok = await updateProspectMetaAction(prospect.id, {
        restaurantName: String(form.get("restaurantName") ?? ""),
        currency: String(form.get("currency") ?? "CAD"),
        detectedAddress: String(form.get("detectedAddress") ?? "") || null,
        commissionRatePct: Number(form.get("commissionRatePct") ?? 28),
        assumedMonthlyOrders: Number(form.get("assumedMonthlyOrders") ?? 300),
        notes: String(form.get("notes") ?? "") || null,
        contactName: String(form.get("contactName") ?? "") || null,
      });
      if (ok) toast.success(t("metaSaveSuccess"));
      else toast.error(t("metaSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <Field label={t("nameLabel")}>
        <Input name="restaurantName" defaultValue={prospect.restaurantName} required />
      </Field>
      <Field label={t("currencyLabel")}>
        <Select name="currency" defaultValue={prospect.currency}>
          {CURRENCY_VALUES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("commissionLabel")}>
        <Input name="commissionRatePct" type="number" min="0" max="50" defaultValue={prospect.commissionRatePct} />
      </Field>
      <Field label={t("assumedOrdersLabel")}>
        <Input name="assumedMonthlyOrders" type="number" min="0" defaultValue={prospect.assumedMonthlyOrders} />
      </Field>
      <Field label={t("addressLabel")} hint={t("addressHint")}>
        <Input name="detectedAddress" defaultValue={prospect.detectedAddress ?? ""} />
      </Field>
      <Field label={t("contactNameLabel")} hint={t("contactNameHint")}>
        <Input name="contactName" defaultValue={prospect.contactName ?? ""} placeholder={t("contactNamePlaceholder")} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label={t("notesLabel")}>
          <Input name="notes" defaultValue={prospect.notes ?? ""} placeholder={t("notesPlaceholder")} />
        </Field>
      </div>
      <div className="flex items-end">
        <Button type="submit" size="sm" variant="secondary" disabled={isSaving} className="w-full">
          {isSaving ? t("saving") : t("saveMeta")}
        </Button>
      </div>
    </form>
  );
}

export function ProspectGenerator({ prospect }: { prospect: Prospect | null }) {
  if (!prospect) return <IngestionFlow />;
  return <ProspectEditor prospect={prospect} />;
}
