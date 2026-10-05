"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ReferralSettingsTab } from "@/components/chat/ReferralSettingsTab";
import { SettingsNav } from "../SettingsNav";

export default function SettingsParrainagePage() {
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Parrainage" />
      <SettingsNav active="parrainage" />
      <ReferralSettingsTab />
    </div>
  );
}
