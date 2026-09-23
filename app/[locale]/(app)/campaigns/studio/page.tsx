import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CampaignsSubNav } from "../CampaignsSubNav";
import { MarketingStudioView } from "../MarketingStudioView";

export const metadata: Metadata = { title: "Studio visuel — Campagnes" };

export default function CampaignStudioPage() {
  return (
    <div className="space-y-5">
      <CampaignsSubNav />
      <PageHeader
        eyebrow="Marketing"
        title="Studio visuel"
        description="Créez un visuel adapté à votre établissement, puis téléchargez-le ou publiez-le sur Instagram si le compte est connecté."
      />
      <MarketingStudioView />
    </div>
  );
}
