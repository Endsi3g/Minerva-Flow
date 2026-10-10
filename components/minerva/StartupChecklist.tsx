"use client";


import { useTranslations } from "next-intl";
import { useCurrentRestaurant } from "@/lib/app-context";
import { useLocalStorageBoolean } from "@/hooks/use-local-storage-state";
import { getStartupProgressAction } from "@/app/[locale]/(app)/overview/actions";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Building2, MapPin, Plug, CalendarPlus, UserPlus, Sparkles, UtensilsCrossed, QrCode } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const STORAGE_PREFIX = "mv-checklist-done:";

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Building2;
  done: boolean;
};

export function StartupChecklist() {
  const t = useTranslations("startupChecklist");
  const restaurant = useCurrentRestaurant();
  const [progress, setProgress] = useState<{
    serviceDaysCount: number;
    memberCount: number;
    hasAddress: boolean;
    toolsConnectedCount: number;
    liveMenuCount: number;
    customerCount: number;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const dismissKey = restaurant ? STORAGE_PREFIX + restaurant.id : STORAGE_PREFIX + "pending";
  const [dismissedForGood] = useLocalStorageBoolean(dismissKey, true);

  useEffect(() => {
    if (!restaurant) return;
    getStartupProgressAction(restaurant.id).then(setProgress);
  }, [restaurant]);

  if (!restaurant || !progress || dismissedForGood) return null;

  const items: ChecklistItem[] = [
    {
      key: "etablissement",
      label: t("setUpYourRestaurant"),
      description: t("giveRealName"),
      href: "/etablissement",
      icon: Building2,
      done: restaurant.name !== "Mon restaurant",
    },
    {
      key: "menu",
      label: t("publishYourMenu"),
      description: t("thisIsWhatYour"),
      href: "/menu",
      icon: UtensilsCrossed,
      done: progress.liveMenuCount > 0,
    },
    {
      key: "first-customer",
      label: t("signUpYourFirst"),
      description: t("displayYourQrAt"),
      href: "/fidelisation",
      icon: QrCode,
      done: progress.customerCount > 0,
    },
    {
      key: "day",
      label: t("addYourFirstDay"),
      description: t("theBaseDataThat"),
      href: "/days",
      icon: CalendarPlus,
      done: progress.serviceDaysCount > 0,
    },
    {
      key: "address",
      label: t("completeTheAddress"),
      description: t("addressHoursAndWebsite"),
      href: "/etablissement",
      icon: MapPin,
      done: progress.hasAddress,
    },
    {
      key: "team",
      label: t("inviteATeamMember"),
      description: t("generateAnInvitationLink"),
      href: "/collaborateurs",
      icon: UserPlus,
      done: progress.memberCount > 1,
    },
    {
      key: "integrations",
      label: t("connectYourTools"),
      description: t("squareStripeGoogleCalendar"),
      href: "/settings",
      icon: Plug,
      done: progress.toolsConnectedCount > 0,
    },
    {
      key: "insight",
      label: t("unlockYourFirstRecommendations"),
      description: t("addAtLeast3"),
      href: "/overview",
      icon: Sparkles,
      done: progress.serviceDaysCount >= 3,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) {
    if (restaurant) localStorage.setItem(STORAGE_PREFIX + restaurant.id, "1");
    return null;
  }

  return (
    <div className="mv-animate-in mb-6 rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="flex-1">
          <p className="font-display text-[15px] font-medium text-mv-ink">
            {t("startProgress", { done: doneCount, total: items.length })}
          </p>
          <p className="mt-0.5 text-[12px] text-mv-ink-faint">
            {t("theseStepsTurnOn")}
          </p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-mv-border-soft">
            <div
              className="h-full rounded-full bg-mv-green transition-all"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </div>
        </div>
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="text-mv-ink-faint shrink-0"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="checklist-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.22, delay: 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden border-t border-mv-border-soft"
          >
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-3 transition-colors",
                    item.done ? "opacity-60" : "hover:bg-mv-cream-soft"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      item.done ? "bg-mv-green text-mv-cream-soft" : "bg-mv-cream-soft text-mv-ink-soft"
                    )}
                  >
                    {item.done ? <Check size={15} /> : <item.icon size={15} />}
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-mv-ink">{item.label}</span>
                    <span className="block text-[12px] text-mv-ink-faint">{item.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
