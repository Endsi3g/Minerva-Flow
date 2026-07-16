"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { GOOGLE_FEATURE_LABELS, GOOGLE_SCOPES, type GoogleFeature } from "@/lib/google/config";
import { GoogleConnectModal } from "@/components/minerva/GoogleConnectModal";
import {
  getGoogleWorkspaceStatusAction,
  saveGa4PropertyIdAction,
} from "@/app/(app)/settings/google-workspace-actions";
import type { GoogleConnection } from "@/lib/data/google-connections";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gmail, GoogleSheets, GoogleDrive, GoogleCalendar, GoogleAnalytics } from "@/components/ui/BrandIcons";

const FEATURES: GoogleFeature[] = ["gmail", "sheets", "drive", "calendar", "analytics"];

const FEATURE_ICON: Record<GoogleFeature, typeof Gmail> = {
  gmail: Gmail,
  sheets: GoogleSheets,
  drive: GoogleDrive,
  calendar: GoogleCalendar,
  analytics: GoogleAnalytics,
};

export function GoogleWorkspaceCard() {
  const { restaurantId } = useApp();
  const [status, setStatus] = useState<{ configured: boolean; connection: GoogleConnection | null } | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [ga4Input, setGa4Input] = useState("");

  async function refresh() {
    if (!restaurantId) return;
    const data = await getGoogleWorkspaceStatusAction(restaurantId);
    setStatus(data);
    setGa4Input(data.connection?.ga4PropertyId ?? "");
  }

  useEffect(() => {
    refresh();
  }, [restaurantId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected")) {
      toast.success("Google connecté avec succès.");
      refresh();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google_error")) {
      toast.error("La connexion Google a échoué — réessayez.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveGa4() {
    if (!restaurantId || !ga4Input.trim()) return;
    await saveGa4PropertyIdAction(restaurantId, ga4Input);
    toast.success("ID de propriété GA4 enregistré.");
    refresh();
  }

  if (!status) return null;

  const connection = status.connection;
  const grantedFeatures = FEATURES.filter((f) => connection?.grantedScopes.includes(GOOGLE_SCOPES[f]));

  return (
    <Card>
      <CardHeader
        eyebrow="Google Workspace"
        title="Google"
        description="Gmail, Sheets, Drive, Calendar et Analytics — une seule connexion, plusieurs fonctionnalités."
      />

      {!status.configured ? (
        <p className="text-[13px] text-mv-ink-faint">Clés API non configurées.</p>
      ) : !connection || connection.status !== "connecte" ? (
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Connecter Google
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-mv-ink">
                {connection.connectedEmail ?? "Connecté"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {grantedFeatures.map((f) => {
                  const Icon = FEATURE_ICON[f];
                  return (
                    <Badge key={f} tone="green">
                      <Icon width={12} height={12} />
                      {GOOGLE_FEATURE_LABELS[f].title}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
              Gérer
            </Button>
          </div>

          {grantedFeatures.includes("analytics") && (
            <Field>
              <FieldLabel htmlFor="ga4-property-id">ID de propriété GA4</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="ga4-property-id"
                  value={ga4Input}
                  onChange={(e) => setGa4Input(e.target.value)}
                  placeholder="Ex : 123456789"
                  className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={handleSaveGa4}>
                  Enregistrer
                </Button>
              </div>
            </Field>
          )}
        </div>
      )}

      <GoogleConnectModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          refresh();
        }}
      />
    </Card>
  );
}
