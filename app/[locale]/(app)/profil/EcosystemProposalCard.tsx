"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/spinner";
import { useTranslations } from "next-intl";
import { Lightbulb, Sparkles, Send, CheckCircle2, Clock, Calendar, Check, Layers } from "lucide-react";
import { toast } from "sonner";
import { submitAppProposalAction, getMyProposalsAction } from "./actions";
import type { EcosystemAppProposal, EcosystemProposalStatus } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const statusTone: Record<EcosystemProposalStatus, { labelKey: string; className: string }> = {
  submitted: { labelKey: "statusSubmitted", className: "bg-mv-cream text-mv-ink-soft border-mv-border" },
  under_review: { labelKey: "statusUnderReview", className: "bg-amber-50 text-amber-800 border-amber-200" },
  planned: { labelKey: "statusPlanned", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  declined: { labelKey: "statusDeclined", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function EcosystemProposalCard() {
  const t = useTranslations("profile");
  const [appName, setAppName] = useState("");
  const [category, setCategory] = useState("operations");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [proposals, setProposals] = useState<EcosystemAppProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getMyProposalsAction();
        if (mounted) setProposals(data);
      } catch (err) {
        console.error("Failed to load proposals", err);
      } finally {
        if (mounted) setLoadingProposals(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appName.trim() || !description.trim()) {
      toast.error(t("saveError"));
      return;
    }

    startTransition(async () => {
      const res = await submitAppProposalAction({
        appName,
        category,
        description,
      });

      if (res.ok) {
        toast.success(t("proposalSubmitted"));
        setAppName("");
        setDescription("");
        setCategory("operations");
        setProposals((prev) => [res.proposal, ...prev]);
      } else {
        toast.error(res.error || t("proposalError"));
      }
    });
  }

  return (
    <Card className="space-y-6">
      <CardHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-mv-green-dark">
            <Sparkles size={12} />
            Minerva Ecosystem
          </span>
        }
        title={t("proposeAppTitle")}
        description={t("proposeAppDescription")}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("appNameLabel")} required>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder={t("appNamePlaceholder")}
              disabled={isPending}
              required
            />
          </Field>

          <Field label={t("categoryLabel")} required>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isPending}
            >
              <option value="operations">{t("categories.operations")}</option>
              <option value="hr">{t("categories.hr")}</option>
              <option value="marketing">{t("categories.marketing")}</option>
              <option value="supply">{t("categories.supply")}</option>
              <option value="finance">{t("categories.finance")}</option>
              <option value="other">{t("categories.other")}</option>
            </Select>
          </Field>
        </div>

        <Field label={t("descriptionLabel")} required>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            disabled={isPending}
            className="min-h-24"
            required
          />
        </Field>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || !appName.trim() || !description.trim()}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Spinner className="size-4" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Send size={14} />
                {t("submitProposal")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Previously submitted proposals */}
      <div className="border-t border-mv-border pt-5">
        <h4 className="mb-3 font-display text-[15px] font-medium text-mv-ink">
          {t("myProposalsTitle")}
        </h4>

        {loadingProposals ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="size-5 text-mv-ink-faint" />
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-[13px] text-mv-ink-soft italic">
            {t("noProposalsYet")}
          </p>
        ) : (
          <div className="space-y-3">
            {proposals.map((prop) => {
              const statusCfg = statusTone[prop.status] || statusTone.submitted;
              return (
                <div
                  key={prop.id}
                  className="flex flex-col gap-2 rounded-xl border border-mv-border bg-mv-cream/40 p-3.5 transition-colors sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[14px] font-semibold text-mv-ink">
                        {prop.appName}
                      </span>
                      <span className="rounded-md bg-mv-surface px-2 py-0.5 text-[11px] font-medium text-mv-ink-soft border border-mv-border">
                        {t(`categories.${prop.category}` as Parameters<typeof t>[0]) || prop.category}
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                      {prop.description}
                    </p>
                    <span className="block text-[11px] text-mv-ink-faint">
                      {formatRelativeTime(prop.createdAt)}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${statusCfg.className}`}
                  >
                    {t(statusCfg.labelKey as Parameters<typeof t>[0])}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
