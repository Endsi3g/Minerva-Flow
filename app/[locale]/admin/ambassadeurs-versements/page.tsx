import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayoutApprovalQueue, type PayoutApprovalItem } from "./PayoutApprovalQueue";

export default async function AmbassadorPayoutApprovalPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("flow_ambassador_commissions")
    .select("id, stripe_invoice_id, commission_amount, currency, payable_at, paid_at_source, flow_ambassador_referrals!inner(flow_ambassadors!inner(user_id, code))")
    .in("status", ["pending", "payable"])
    .is("payout_approved_at", null)
    .is("stripe_transfer_id", null)
    .lte("payable_at", new Date().toISOString())
    .order("payable_at", { ascending: true })
    .limit(100);

  const rows = (data ?? []) as unknown as {
    id: string;
    stripe_invoice_id: string;
    commission_amount: number;
    currency: string;
    payable_at: string;
    paid_at_source: string;
    flow_ambassador_referrals: { flow_ambassadors: { user_id: string; code: string } };
  }[];
  const userIds = [...new Set(rows.map((row) => row.flow_ambassador_referrals.flow_ambassadors.user_id))];
  const users = await Promise.all(userIds.map(async (userId) => {
    const { data: result } = await admin.auth.admin.getUserById(userId);
    return [userId, result.user?.email ?? null] as const;
  }));
  const emailById = new Map(users);
  const items: PayoutApprovalItem[] = rows.map((row) => {
    const ambassador = row.flow_ambassador_referrals.flow_ambassadors;
    return {
      id: row.id,
      email: emailById.get(ambassador.user_id) ?? null,
      code: ambassador.code,
      amount: Number(row.commission_amount),
      currency: row.currency.toUpperCase(),
      invoiceId: row.stripe_invoice_id,
      payableAt: row.payable_at,
      createdAt: row.paid_at_source,
    };
  });

  return <div className="space-y-5">
    <PageHeader eyebrow="Communauté · Paiements" title="Approbation des commissions" description="Chaque transfert reste bloqué jusqu’à la validation explicite d’un administrateur Minerva Flow. Seules les commissions payées depuis au moins 30 jours apparaissent ici." />
    <PayoutApprovalQueue items={items} />
  </div>;
}
