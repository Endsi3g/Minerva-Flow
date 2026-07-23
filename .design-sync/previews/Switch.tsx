import * as React from "react";
import { Switch, Label } from "minerva-flow";

export function Off() {
  return (
    <div className="flex items-center gap-2">
      <Switch id="preview-switch-off" />
      <Label htmlFor="preview-switch-off">Réservations en ligne</Label>
    </div>
  );
}

export function On() {
  return (
    <div className="flex items-center gap-2">
      <Switch id="preview-switch-on" defaultChecked />
      <Label htmlFor="preview-switch-on">Accepter les commandes à emporter</Label>
    </div>
  );
}

export function Small() {
  return (
    <div className="flex items-center gap-2">
      <Switch id="preview-switch-sm" size="sm" defaultChecked />
      <Label htmlFor="preview-switch-sm">Mode terrasse</Label>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex items-center gap-2">
      <Switch id="preview-switch-disabled" disabled />
      <Label htmlFor="preview-switch-disabled">Programme de fidélité (bientôt)</Label>
    </div>
  );
}

export function SettingsList() {
  const rows = [
    { id: "preview-switch-row-1", label: "Notifications de nouvelle commande", checked: true },
    { id: "preview-switch-row-2", label: "Fermer automatiquement à minuit", checked: false },
    { id: "preview-switch-row-3", label: "Afficher les pourboires sur le reçu", checked: true },
  ];
  return (
    <div className="flex w-[300px] flex-col gap-3">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between">
          <Label htmlFor={row.id}>{row.label}</Label>
          <Switch id={row.id} defaultChecked={row.checked} />
        </div>
      ))}
    </div>
  );
}
