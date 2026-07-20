"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";

const localeLabel: Record<Locale, string> = { fr: "Français", en: "English" };

export function LanguageSwitcherCard() {
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <Card>
      <CardHeader eyebrow="Préférences" title="Langue" description="La langue utilisée dans l'application." />
      <div className="flex gap-2">
        {SUPPORTED_LOCALES.map((l) => (
          <Button
            key={l}
            type="button"
            variant={l === locale ? "primary" : "secondary"}
            size="sm"
            disabled={pending}
            onClick={() => setLocale(l)}
          >
            {localeLabel[l]}
          </Button>
        ))}
      </div>
    </Card>
  );
}
