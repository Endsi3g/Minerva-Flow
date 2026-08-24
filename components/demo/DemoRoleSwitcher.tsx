"use client";

import { useState } from "react";
import { toast } from "sonner";
import { switchDemoRoleAction } from "@/components/demo/actions";
import { ArrowLeftRight } from "lucide-react";
import type { Role } from "@/lib/types";

/**
 * Demo-account-only: previews the app as owner (LTV-first sidebar/Overview)
 * or staff (full operational access) — a real role change on the demo
 * restaurant, not a client-side fake, so every role-conditional surface
 * (AppSidebar, Overview) reflects it correctly after router.refresh().
 */
export function DemoRoleSwitcher({ currentRole }: { currentRole: Role }) {
  const [switching, setSwitching] = useState(false);
  const isStaff = currentRole === "staff";

  async function handleSwitch() {
    setSwitching(true);
    try {
      const next = isStaff ? "owner" : "staff";
      const ok = await switchDemoRoleAction(next);
      if (ok) {
        toast.success(next === "owner" ? "Aperçu propriétaire activé." : "Aperçu staff activé.");
        // A plain router.refresh() doesn't reliably re-run the root layout
        // (AppProvider's role prop) in every case — a full reload
        // guarantees every role-conditional surface (sidebar, Overview)
        // picks up the change. This is a deliberate, low-frequency demo
        // action, not a hot path, so the reload cost is fine.
        window.location.reload();
      } else {
        toast.error("Impossible de changer de rôle pour l'instant.");
        setSwitching(false);
      }
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="border-t border-mv-border-soft px-2.5 py-2">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        Démo — vérifier les deux côtés
      </p>
      <button
        onClick={handleSwitch}
        disabled={switching}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-cream disabled:opacity-50"
      >
        <span className="flex items-center gap-1.5">
          <ArrowLeftRight size={13} className="text-mv-green-dark" />
          {switching ? "Un instant…" : isStaff ? "Voir comme propriétaire" : "Voir comme staff"}
        </span>
      </button>
    </div>
  );
}
