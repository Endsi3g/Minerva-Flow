import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FlowAmbassadorWorkspace } from "@/components/workspace/FlowAmbassadorWorkspace";
import { getFlowAmbassadorPageAction } from "../actions";

export const metadata: Metadata = { title: "Ambassadeurs | Workspace" };

export default async function AmbassadorsWorkspacePage() {
  const data = await getFlowAmbassadorPageAction();
  if (!data) redirect("/sign-in");
  return <div className="space-y-5"><PageHeader eyebrow="Workspace · Communauté" title="Ambassadeurs & UGC" description="Un espace simple pour recommander Minerva Flow, suivre vos commissions et créer du contenu avec des restaurants participants." /><FlowAmbassadorWorkspace initial={data} /></div>;
}
