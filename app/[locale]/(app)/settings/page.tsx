"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { IntegrationsGrid } from "@/components/minerva/IntegrationsGrid";
import { SettingsNav } from "./SettingsNav";

export default function SettingsIntegrationsPage() {
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Intégrations" />
      <SettingsNav active="integrations" />
      <IntegrationsGrid />
    </div>
  );
}
