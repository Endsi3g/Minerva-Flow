"use client";


import { useLocale } from "next-intl";
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
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Sécurité" />
      <SettingsNav active="securite" />
      <SecuritySessions />
    </div>
  );
}

function SecuritySessions() {
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
      toast.success("Appareil déconnecté.");
      setSessions((prev) => prev.filter((s) => s.id !== toRevoke.id));
    } else {
      toast.error("La déconnexion de cet appareil a échoué.");
    }
  }

  if (loading) {
    return (
      <EditorialLoadingState
        title="Détection des appareils connectés…"
        subtitle="Recherche des sessions actives et des autorisations de sécurité."
        rows={2}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AlertBanner tone="info" title="Vos appareils connectés">
        Plusieurs appareils connectés en même temps, c&apos;est normal (téléphone, ordinateur du resto, etc.) — ceci
        sert surtout à repérer une connexion qui ne vous appartient pas et à la déconnecter. La déconnexion prend
        effet dans les minutes qui suivent, pas instantanément.
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
        title="Déconnecter cet appareil ?"
        description={`${toRevoke?.device ?? "Cet appareil"}${toRevoke?.browser ? ` — ${toRevoke.browser}` : ""} sera déconnecté de votre compte. Si c'est bien vous, il vous suffira de vous reconnecter.`}
        actionLabel="Déconnecter"
        onConfirm={handleRevoke}
      />
    </div>
  );
}
