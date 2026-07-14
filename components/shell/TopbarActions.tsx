"use client";

import { useApp, roleLabels } from "@/lib/app-context";
import { CurrentUserAvatar } from "@/components/minerva/CurrentUserAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatRelativeTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, LogOut, User, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(app)/notifications-actions";
import type { Notification } from "@/lib/data/notifications";
import type { Period } from "@/lib/app-context";

const periods: { id: Period; label: string }[] = [
  { id: "jour", label: "Jour" },
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "custom", label: "Personnalisé" },
];

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function PeriodFilter() {
  const { period, setPeriod } = useApp();
  return (
    <div className="flex h-9 items-center rounded-lg border border-mv-border bg-mv-surface p-0.5">
      {periods.map((p) => (
        <button
          key={p.id}
          onClick={() => setPeriod(p.id)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
            period === p.id
              ? "bg-mv-green text-mv-cream-soft"
              : "text-mv-ink-soft hover:text-mv-ink"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function UserMenu() {
  const { role, authUser } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const name = authUser?.fullName || "Camille Andrieu";
  const email = authUser?.email || "quebecsaas@gmail.com";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-mv-ink/5"
      >
        <CurrentUserAvatar size={30} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-semibold text-mv-ink">{name}</span>
          <span className="block text-[11.5px] text-mv-ink-faint">{roleLabels[role]}</span>
        </span>
        <ChevronDown size={14} className="text-mv-ink-faint" />
      </button>
      {open && (
        <div className="mv-animate-in absolute right-0 top-12 z-40 w-64 rounded-xl border border-mv-border bg-mv-surface p-1.5 shadow-mv-lg">
          <div className="px-2.5 py-2">
            <p className="text-[13px] font-semibold text-mv-ink">{name}</p>
            <p className="text-[12px] text-mv-ink-faint">{email}</p>
          </div>
          <div className="border-t border-mv-border-soft px-2.5 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Rôle
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-mv-ink-soft">{roleLabels[role]}</p>
          </div>
          <div className="mt-1 border-t border-mv-border-soft pt-1.5">
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-mv-ink-soft hover:bg-mv-cream-soft">
              <User size={15} /> Profil
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-mv-red hover:bg-mv-red-bg"
            >
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const { restaurantId } = useApp();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function refresh() {
    if (!restaurantId) return;
    setNotifications(await getNotificationsAction(restaurantId));
  }

  useEffect(() => {
    refresh();
  }, [restaurantId]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) refresh();
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await markNotificationReadAction(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    if (!restaurantId) return;
    await markAllNotificationsReadAction(restaurantId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-mv-border bg-mv-surface text-mv-ink-soft transition-colors hover:bg-mv-cream-soft">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-mv-red" />
            )}
          </button>
        }
      />
      <PopoverContent className="w-80 p-0" sideOffset={8} align="end">
        <div className="flex items-center justify-between border-b border-mv-border-soft px-3 py-2.5">
          <p className="text-[13px] font-semibold text-mv-ink">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11.5px] font-medium text-mv-green-dark hover:underline"
            >
              Tout marquer lu
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12.5px] text-mv-ink-faint">
              Aucune notification.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-mv-border-soft px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-mv-cream-soft",
                  !n.read && "bg-mv-green-tint/40"
                )}
              >
                <p className="text-[12.5px] font-semibold text-mv-ink">{n.title}</p>
                {n.body && <p className="text-[12px] text-mv-ink-soft">{n.body}</p>}
                <p className="text-[10.5px] text-mv-ink-faint">{formatRelativeTime(n.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TopbarActions() {
  return (
    <div className="flex items-center gap-3">
      <PeriodFilter />
      <NotificationBell />
      <div className="h-6 w-px bg-mv-border" />
      <UserMenu />
    </div>
  );
}
