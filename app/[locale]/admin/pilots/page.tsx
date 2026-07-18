import { getPilotRequests } from "@/lib/data/pilot-requests";
import { PilotsView } from "./PilotsView";

export default async function AdminPilotsPage() {
  const pilots = await getPilotRequests();

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">Demandes pilotes</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {pilots.filter((p) => p.status === "nouveau").length} nouvelle(s) demande(s) à traiter.
      </p>
      <PilotsView pilots={pilots} />
    </div>
  );
}
