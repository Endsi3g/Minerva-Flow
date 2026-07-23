import * as React from "react";
import { StatCard } from "minerva-flow";
import { DollarSign, Users, UtensilsCrossed } from "lucide-react";

export function Default() {
  return (
    <div className="w-[220px]">
      <StatCard
        label="Revenu du jour"
        value="6 420 $"
        delta={12.4}
        sublabel="vs hier"
        icon={DollarSign}
        accent="green"
      />
    </div>
  );
}

export function NegativeDelta() {
  return (
    <div className="w-[220px]">
      <StatCard
        label="Temps de table moyen"
        value="54 min"
        delta={-6.2}
        sublabel="vs semaine dernière"
        icon={Users}
        accent="ink"
      />
    </div>
  );
}

export function Row() {
  return (
    <div className="flex w-[680px] gap-4">
      <StatCard
        label="Couverts servis"
        value="312"
        delta={8.1}
        sublabel="cette semaine"
        icon={Users}
        accent="green"
      />
      <StatCard
        label="Commandes"
        value="184"
        delta={3.5}
        sublabel="aujourd'hui"
        icon={UtensilsCrossed}
        accent="lime"
      />
      <StatCard
        label="Revenu net"
        value="6 420 $"
        sublabel="cette semaine"
        icon={DollarSign}
        accent="ink"
      />
    </div>
  );
}
