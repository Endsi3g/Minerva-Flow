import { getAllSupportRequestsForAdmin } from "@/lib/data/admin";
import { SupportAdminView } from "./SupportAdminView";

export default async function AdminSupportPage() {
  const tickets = await getAllSupportRequestsForAdmin();

  return (
    <div>
      <h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">Support</h1>
      <p className="mb-6 text-[13px] text-mv-ink-soft">
        {tickets.filter((t) => t.status !== "resolu").length} ticket(s) ouvert(s).
      </p>
      <SupportAdminView tickets={tickets} />
    </div>
  );
}
