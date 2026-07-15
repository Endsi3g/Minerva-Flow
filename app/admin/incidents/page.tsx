import { getIncidents } from "@/lib/data/incidents";
import { IncidentsView } from "./IncidentsView";

export default async function AdminIncidentsPage() {
  const incidents = await getIncidents();

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">Registre des incidents</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        Obligation Loi 25 — consignez tout incident de confidentialité, même mineur.
      </p>
      <IncidentsView initialIncidents={incidents} />
    </div>
  );
}
