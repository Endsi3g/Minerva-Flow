"use client";


import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { EditorialLoadingState } from "@/components/ui/EditorialLoadingState";
import { getMySessionsAction, revokeSessionAction } from "../actions";
import type { DeviceSession } from "@/lib/data/sessions";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { Badge } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import { SettingsNav } from "../SettingsNav";

const deviceIcon: Record<string, typeof Monitor> = {
  iPhone: Smartphone,
  "Téléphone Android": Smartphone,
  iPad: Tablet,
  "Tablette Android": Tablet,
};

export default function SettingsSecuritePage() {
  const t = useTranslations("securityPage");
  return (
    <div>
      <PageHeader eyebrow="Configuration" title={t("security")} />
      <SettingsNav active="securite" />
      <SecuritySessions />
    </div>
  );
}

function SecuritySessions() {
  const t = useTranslations("securityPage");
  const locale = useLocale();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [toRevoke, setToRevoke] = useState<DeviceSession | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMySessionsAction().then((data) => {
      if (isMounted) {
        setSessions(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRevoke() {
    if (!toRevoke) return;
    const ok = await revokeSessionAction(toRevoke.id);
    if (ok) {
      toast.success(t("deviceSignedOut"));
      setSessions((prev) => prev.filter((s) => s.id !== toRevoke.id));
    } else {
      toast.error(t("couldNotSignOut"));
    }
  }

  if (loading) {
    return (
      <EditorialLoadingState
        title={t("detectingConnectedDevices")}
        subtitle={t("lookingForActiveSessions")}
        rows={2}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AlertBanner tone="info" title={t("yourConnectedDevices")}>
        {t("severalDevicesSignedIn")}
      </AlertBanner>
      <div className="space-y-3">
        {sessions.map((s) => {
          const Icon = deviceIcon[s.device] ?? Monitor;
          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-[15px] font-medium text-mv-ink">
                        {s.device}
                        {s.browser ? ` — ${s.browser}` : ""}
                      </p>
                      {s.isCurrent && (
                        <Badge tone="green" variant="subtle" size="sm">
                          Cet appareil
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-mv-ink-soft">
                      Dernière activité {formatRelativeTime(s.updatedAt, locale)} · Connecté depuis{" "}
                      {formatRelativeTime(s.createdAt, locale)}
                      {s.ip ? ` · ${s.ip}` : ""}
                    </p>
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => setToRevoke(s)}
                    className="shrink-0 rounded-lg border border-mv-border px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:border-mv-red/30 hover:text-mv-red"
                  >
                    Déconnecter
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDestructiveModal
        open={Boolean(toRevoke)}
        onOpenChange={(open) => !open && setToRevoke(null)}
        title={t("signOutThisDevice")}
        description={`${toRevoke?.device ?? "Cet appareil"}${toRevoke?.browser ? ` — ${toRevoke.browser}` : ""} sera déconnecté de votre compte. Si c'est bien vous, il vous suffira de vous reconnecter.`}
        actionLabel={t("signOut")}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
