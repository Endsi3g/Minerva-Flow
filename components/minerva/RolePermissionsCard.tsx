import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { roleLabels } from "@/lib/app-context";
import type { Role } from "@/lib/types";
import { Eye, PenSquare, ShieldCheck, UserCog } from "lucide-react";

export const roleTone: Record<Role, "green" | "lime" | "amber"> = {
  owner: "green",
  manager: "green",
  staff: "lime",
  consultant: "amber",
};

export const rolePermissions: Record<Role, { icon: typeof Eye; text: string }> = {
  owner: { icon: ShieldCheck, text: "Accès complet : configuration, finance, équipe, tous les modules." },
  manager: { icon: UserCog, text: "Gère l'équipe, les finances et les intégrations, sans les réglages du compte." },
  staff: { icon: PenSquare, text: "Encode les journées de service : notes, événements, anomalies." },
  consultant: { icon: Eye, text: "Lecture des données et rédaction de notes / plans d'action." },
};

/**
 * "Permissions par rôle" reference card — shared by Settings (Rôles &
 * équipe) and Profil (Capacités). Pass `highlightRole` to ring/mark the
 * viewer's own role when this is rendered on their profile.
 */
export function RolePermissionsCard({
  highlightRole,
  eyebrow,
}: {
  highlightRole?: Role;
  eyebrow?: string;
}) {
  return (
    <Card>
      <CardHeader eyebrow={eyebrow} title="Permissions par rôle" />
      <div className="space-y-3">
        {(Object.keys(roleLabels) as Role[]).map((r) => {
          const Icon = rolePermissions[r].icon;
          const isMine = r === highlightRole;
          return (
            <div
              key={r}
              className={
                isMine
                  ? "rounded-xl border border-mv-green bg-mv-green-tint/40 p-3.5 ring-1 ring-mv-green/30"
                  : "rounded-xl border border-mv-border-soft p-3.5"
              }
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
                    <Icon size={14} />
                  </div>
                  <Badge tone={roleTone[r]}>{roleLabels[r]}</Badge>
                </div>
                {isMine && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-mv-green-dark">
                    Votre rôle
                  </span>
                )}
              </div>
              <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                {rolePermissions[r].text}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
