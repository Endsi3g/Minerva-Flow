import { getProspectById } from "@/lib/data/prospects";
import { ProspectGenerator } from "../ProspectGenerator";
import { notFound } from "next/navigation";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await getProspectById(id);
  if (!prospect) notFound();

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">{prospect.restaurantName}</h1>
      <p className="mb-6 truncate text-[13px] text-mv-ink-soft">{prospect.sourceUrl}</p>
      <ProspectGenerator prospect={prospect} />
    </div>
  );
}
