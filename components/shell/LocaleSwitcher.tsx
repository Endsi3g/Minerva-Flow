"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabelKeys: Record<string, "french" | "turkish"> = {
  fr: "french",
  tr: "turkish",
};

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1">
      <Globe size={13} className="shrink-0 text-mv-ink-faint" />
      <select
        aria-label={t("switchLabel")}
        value={locale}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 bg-transparent text-[12px] font-medium text-mv-ink-soft outline-none disabled:opacity-50"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(localeLabelKeys[loc])}
          </option>
        ))}
      </select>
    </div>
  );
}
