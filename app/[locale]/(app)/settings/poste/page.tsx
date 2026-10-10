"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { SettingsNav } from "../SettingsNav";
import { useIsDesktopApp } from "@/lib/desktop/useDesktop";
import {
  getDesktopInfo,
  notifyDesktop,
  printCurrentPage,
  printEscPos,
  setKioskMode,
} from "@/lib/desktop/bridge";
import { playOrderChime, readStationPrefs, writeStationPrefs, type StationPrefs } from "@/lib/desktop/prefs";
import { buildTicket } from "@/lib/desktop/escpos";

export default function StationSettingsPage() {
  const desktop = useIsDesktopApp();
  const [prefs, setPrefs] = useState<StationPrefs>(() => readStationPrefs());
  const [kiosk, setKiosk] = useState(false);
  const [info, setInfo] = useState<{ version: string; platform: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (desktop) void getDesktopInfo().then((value) => value && setInfo(value));
  }, [desktop]);

  function update(next: Partial<StationPrefs>) {
    setPrefs(writeStationPrefs(next));
  }

  async function toggleKiosk(enabled: boolean) {
    try {
      await setKioskMode(enabled);
      setKiosk(enabled);
      toast.success(enabled ? "Mode caisse activé. Quittez-le avec ce même réglage." : "Mode caisse désactivé.");
    } catch {
      toast.error("Le mode caisse n'a pas pu changer. Réessayez.");
    }
  }

  async function testAlert() {
    playOrderChime();
    const shown = await notifyDesktop("Nouvelle commande", "Ceci est un test d'alerte.");
    if (!shown) toast.message("Autorisez les notifications de Minerva Flow dans les réglages du système pour voir la bannière.");
  }

  async function testThermalPrinter() {
    if (!prefs.printerHost.trim()) {
      toast.error("Saisissez l'adresse de l'imprimante, par exemple 192.168.1.50.");
      return;
    }
    setBusy(true);
    try {
      const ticket = buildTicket({
        title: "Minerva Flow",
        subtitle: "Ticket de test",
        lines: [{ left: "1 x Café allongé", right: "4,00 $" }, { left: "1 x Crème brûlée", right: "9,00 $" }],
        footer: "Impression réussie",
      });
      await printEscPos(prefs.printerHost.trim(), ticket, prefs.printerPort);
      toast.success("Ticket de test envoyé à l'imprimante.");
    } catch (error) {
      toast.error(typeof error === "string" ? error : "L'imprimante n'a pas répondu. Vérifiez son adresse et qu'elle est allumée.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Poste de caisse" description="Alertes, impression et plein écran de cet ordinateur." />
      <SettingsNav active="poste" />

      {!desktop && (
        <Card className="max-w-2xl">
          <h2 className="font-display text-[20px] font-semibold text-mv-ink">Disponible dans l&apos;application pour ordinateur</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mv-ink-soft">
            Les alertes sonores de commande, l&apos;impression de tickets et le mode caisse plein écran demandent l&apos;application macOS ou Windows.
          </p>
          <Link href="/download" className="mt-4 inline-block text-[14px] font-semibold text-mv-green-dark underline">
            Télécharger l&apos;application
          </Link>
        </Card>
      )}

      {desktop && (
        <Card className="max-w-2xl divide-y divide-mv-border">
          <section className="space-y-4 pb-6">
            <h2 className="font-display text-[20px] font-semibold text-mv-ink">Alerte de commande</h2>
            <label className="flex items-center justify-between gap-4 text-[14px] text-mv-ink">
              <span>
                Son et notification à chaque nouvelle commande
                <span className="block text-[13px] text-mv-ink-soft">Même quand la fenêtre est en arrière-plan.</span>
              </span>
              <Switch checked={prefs.orderAlert} onCheckedChange={(checked) => update({ orderAlert: checked })} aria-label="Alerte de commande" />
            </label>
            <Button variant="secondary" onClick={() => void testAlert()}>Tester l&apos;alerte</Button>
          </section>

          <section className="space-y-4 py-6">
            <h2 className="font-display text-[20px] font-semibold text-mv-ink">Impression</h2>
            <div>
              <p className="mb-2 text-[14px] text-mv-ink-soft">Imprimante du système (tickets, rapports, factures)</p>
              <Button variant="secondary" onClick={() => void printCurrentPage()}>Imprimer cette page</Button>
            </div>
            <div className="space-y-2">
              <label htmlFor="printer-host" className="block text-[14px] font-medium text-mv-ink">Imprimante thermique réseau</label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="printer-host"
                  className="h-10 max-w-64"
                  inputMode="decimal"
                  placeholder="192.168.1.50"
                  value={prefs.printerHost}
                  onChange={(event) => update({ printerHost: event.target.value })}
                />
                <Input
                  aria-label="Port"
                  className="h-10 w-24"
                  inputMode="numeric"
                  value={String(prefs.printerPort)}
                  onChange={(event) => update({ printerPort: Number(event.target.value.replace(/\D/g, "")) || 9100 })}
                />
                <Button variant="secondary" disabled={busy} onClick={() => void testThermalPrinter()}>
                  {busy ? "Envoi…" : "Imprimer un ticket test"}
                </Button>
              </div>
              <p className="text-[13px] text-mv-ink-soft">Imprimantes ESC/POS (Epson, Star) sur le réseau local, port 9100 par défaut.</p>
            </div>
          </section>

          <section className="space-y-4 pt-6">
            <h2 className="font-display text-[20px] font-semibold text-mv-ink">Mode caisse</h2>
            <label className="flex items-center justify-between gap-4 text-[14px] text-mv-ink">
              <span>
                Plein écran, toujours au premier plan
                <span className="block text-[13px] text-mv-ink-soft">Pour un poste dédié au comptoir.</span>
              </span>
              <Switch checked={kiosk} onCheckedChange={(checked) => void toggleKiosk(checked)} aria-label="Mode caisse" />
            </label>
            {info && <p className="text-[13px] text-mv-ink-soft">Application version {info.version} · {info.platform}</p>}
          </section>
        </Card>
      )}
    </div>
  );
}
