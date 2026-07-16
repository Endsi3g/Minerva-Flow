import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerForUser, getPortalData } from "@/lib/data/customer-portal";
import { PortalView } from "./PortalView";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const customer = await getCustomerForUser(user.id);
  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <div>
          <p className="font-display text-[19px] font-medium text-mv-ink">Aucune fiche client trouvée</p>
          <p className="mt-1.5 max-w-sm text-[13px] text-mv-ink-soft">
            Ce courriel n&apos;est associé à aucun restaurant pour l&apos;instant. Demandez au personnel de vous
            ajouter comme client.
          </p>
        </div>
      </div>
    );
  }

  const data = await getPortalData(customer);
  return <PortalView customer={customer} data={data} />;
}
