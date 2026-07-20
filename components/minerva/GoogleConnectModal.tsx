"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel, FieldDescription } from "@/components/ui/field";
import { GOOGLE_FEATURE_LABELS, type GoogleFeature } from "@/lib/google/config";
import { useState } from "react";
import { Gmail, GoogleSheets, GoogleDrive, GoogleCalendar, GoogleAnalytics } from "@/components/ui/BrandIcons";

const FEATURES: GoogleFeature[] = ["gmail", "sheets", "drive", "calendar", "analytics"];

const FEATURE_ICON: Record<GoogleFeature, typeof Gmail> = {
  gmail: Gmail,
  sheets: GoogleSheets,
  drive: GoogleDrive,
  calendar: GoogleCalendar,
  analytics: GoogleAnalytics,
};

export function GoogleConnectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<GoogleFeature>>(new Set());

  function toggle(feature: GoogleFeature, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(feature);
      else next.delete(feature);
      return next;
    });
  }

  function handleConnect() {
    const params = new URLSearchParams();
    selected.forEach((f) => params.append("feature", f));
    window.location.href = `/api/oauth/google-workspace?${params.toString()}`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connecter Google"
      description="Choisissez les fonctionnalités à activer — Flow par Minerva ne demande accès qu'à ce que vous cochez."
      width={480}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          {FEATURES.map((feature) => {
            const { title, description } = GOOGLE_FEATURE_LABELS[feature];
            const Icon = FEATURE_ICON[feature];
            return (
              <Field key={feature} orientation="horizontal">
                <Checkbox
                  checked={selected.has(feature)}
                  onCheckedChange={(checked) => toggle(feature, Boolean(checked))}
                />
                <Icon width={18} height={18} className="shrink-0" />
                <FieldContent>
                  <FieldLabel>{title}</FieldLabel>
                  <FieldDescription>{description}</FieldDescription>
                </FieldContent>
              </Field>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleConnect} disabled={selected.size === 0}>
            Connecter Google
          </Button>
        </div>
      </div>
    </Modal>
  );
}
