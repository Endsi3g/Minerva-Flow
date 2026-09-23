"use client";

import { AdPlatformsCard, InstagramCard } from "@/components/minerva/AdPlatformsCard";
import { GoogleWorkspaceCard } from "@/components/minerva/GoogleWorkspaceCard";
import { PosConnectionsCard } from "@/components/minerva/PosConnectionsCard";
import { AccountingConnectionsCard } from "@/components/minerva/AccountingConnectionsCard";
import { ReservationDeliveryConnectionsCard } from "@/components/minerva/ReservationDeliveryConnectionsCard";
import { StripeConnectCard } from "@/components/minerva/StripeConnectCard";

export function IntegrationsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PosConnectionsCard />
      <AccountingConnectionsCard />
      <ReservationDeliveryConnectionsCard />
      <GoogleWorkspaceCard />
      <AdPlatformsCard />
      <div className="col-span-full grid grid-cols-1 gap-4 md:grid-cols-2">
        <InstagramCard />
        <StripeConnectCard />
      </div>
    </div>
  );
}
