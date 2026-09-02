"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { CustomerOriginMap } from "@/components/fidelisation/CustomerOriginMap";
import { getCustomerOriginByCity } from "@/lib/customer-origin";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/lib/types";
import { ArrowLeft, MapPin } from "lucide-react";

export function GeographieView({ customers }: { customers: Customer[] }) {
  const byCity = useMemo(() => getCustomerOriginByCity(customers), [customers]);
  const withCity = customers.filter((c) => c.city?.trim()).length;
  const maxVisits = Math.max(1, ...byCity.map((c) => c.visits));

  return (
    <div>
      <FidelisationSubNav />

      <Link
        href="/fidelisation"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={13} /> Retour à Fidélisation
      </Link>

      <PageHeader
        eyebrow="Géographie"
        title="Provenance des clients"
        description={
          withCity > 0
            ? `${withCity} client${withCity > 1 ? "s ont" : " a"} indiqué sa ville, dans ${byCity.length} ville${byCity.length > 1 ? "s" : ""} — classées par visites cumulées.`
            : "Aucun client n'a encore indiqué sa ville."
        }
      />

      {byCity.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Aucune donnée géographique pour l'instant"
          description="Demandez à vos clients d'ajouter leur ville dans « Mon profil » sur leur portail, ou ajoutez-la vous-même en créant une fiche client."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="h-[560px] p-0">
            <CustomerOriginMap cities={byCity} maxGeocode={30} />
          </Card>

          <Card className="lg:sticky lg:top-4">
            <CardHeader eyebrow="Classement" title="Toutes les villes" />
            <div className="max-h-[500px] space-y-2 overflow-y-auto">
              {byCity.map((c) => (
                <div key={c.city} className="relative overflow-hidden rounded-lg bg-mv-cream-soft p-2.5">
                  <div
                    className="absolute inset-y-0 left-0 bg-mv-green/10"
                    style={{ width: `${Math.max(6, (c.visits / maxVisits) * 100)}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium text-mv-ink">
                      <MapPin size={13} className="shrink-0 text-mv-green-dark" /> {c.city}
                    </span>
                    <span className="flex shrink-0 items-center gap-2.5 text-[11.5px] text-mv-ink-soft">
                      <span>
                        {c.customerCount} client{c.customerCount > 1 ? "s" : ""}
                      </span>
                      <span className="font-semibold text-mv-ink">{c.visits} vis.</span>
                      <span>{formatCurrency(c.spent)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
