import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getProgram } from "@/lib/data/programs";
import { getFinancialTransactions } from "@/lib/data/finance";
import { getCampaigns } from "@/lib/data/campaigns";
import { getServiceDays } from "@/lib/data/service-days";
import { getCustomers } from "@/lib/data/customers";
import { ProgramDetailView } from "./ProgramDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return { title: "Programme récurrent" };
  const program = await getProgram(restaurantId, id);
  return { title: program ? `${program.name} — Revenus récurrents` : "Programme introuvable" };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return <div className="p-6 text-mv-ink-soft">Aucun établissement sélectionné.</div>;
  }

  const program = await getProgram(restaurantId, id);
  if (!program) notFound();

  const [allTransactions, allCampaigns, serviceDays, customers] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getCampaigns(restaurantId),
    getServiceDays(restaurantId, { from: program.startDate, to: program.endDate }),
    getCustomers(restaurantId),
  ]);

  // Interconnected systems data:
  // 1. Transactions directly tagged with program_id, or falling within program dates with matching description
  const linkedTransactions = allTransactions.filter(
    (t) => t.programId === id || (t.date >= program.startDate && t.date <= program.endDate && t.description.toLowerCase().includes(program.name.toLowerCase()))
  );

  // 2. Connected marketing campaigns
  const linkedCampaigns = allCampaigns.filter(
    (c) => program.campaignIds.includes(c.id) || (c.programId && c.programId === id)
  );

  // 3. Recurrent regular customers (Habitués, Privilégiés, Ambassadeurs)
  const regularCustomers = customers
    .filter((c) => c.visitCount >= 2)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 8);

  return (
    <ProgramDetailView
      restaurantId={restaurantId}
      program={program}
      transactions={linkedTransactions}
      campaigns={linkedCampaigns}
      serviceDays={serviceDays}
      regularCustomers={regularCustomers}
    />
  );
}
