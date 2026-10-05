"use client";


import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { MonitorCog } from "lucide-react";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsNav } from "../SettingsNav";

export default function SettingsApparencePage() {
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Apparence" />
      <SettingsNav active="apparence" />
      <AppearanceCard />
    </div>
  );
}

function AppearanceCard() {
  const t = useTranslations("appearancePage");
  const { theme, setTheme } = useTheme();
  const selectedTheme = theme === "dark" || theme === "system" ? theme : "light";

  return (
    <Card className="max-w-2xl">
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <MonitorCog size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-mv-ink">{t("appearance")}</h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-mv-ink-soft">
            {t("lightModeIsUsed")}
          </p>
          <label className="mt-5 block text-sm font-medium text-mv-ink" htmlFor="appearance-theme">
            {t("appTheme")}
          </label>
          <Select value={selectedTheme} onValueChange={(value) => value && setTheme(value)}>
            <SelectTrigger id="appearance-theme" className="mt-2 min-h-11 w-full max-w-xs border-mv-border bg-mv-surface text-mv-ink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("light")}</SelectItem>
              <SelectItem value="system">{t("system")}</SelectItem>
              <SelectItem value="dark">{t("dark")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
