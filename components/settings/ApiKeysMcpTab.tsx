"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/lib/app-context";
import {
  getApiKeysAction,
  createApiKeyAction,
  revokeApiKeyAction,
  deleteApiKeyAction,
  testMcpToolAction,
} from "@/app/[locale]/(app)/settings/actions";
import type { ApiKey } from "@/lib/data/api-keys";
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Play,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";

const AVAILABLE_TOOLS = [
  { id: "minerva_system_health", name: "Diagnostic Supabase Live", desc: "Vérification de connectivité et comptage des tables en direct (zéro mock)" },
  { id: "minerva_get_restaurant_summary", name: "Synthèse Restaurant Flash", desc: "Ventes du jour, commandes, réservations, stocks bas" },
  { id: "minerva_get_menu_items", name: "Catalogue du Menu", desc: "Plats, prix, marges et statuts actifs" },
  { id: "minerva_get_referral_roi_and_ambassadors", name: "ROI Parrainage & Ambassadeurs", desc: "Performance du bouche-à-oreille et top parrains" },
  { id: "minerva_get_prospects", name: "Pipeline Prospection & Leads", desc: "Restaurants cibles et opportunités Reach" },
];

export function ApiKeysMcpTab() {
  const { restaurantId } = useApp();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quick connect tab
  const [connectClient, setConnectClient] = useState<"composio" | "claude" | "cursor" | "antigravity" | "curl">("composio");

  // Tool tester state
  const [selectedTool, setSelectedTool] = useState(AVAILABLE_TOOLS[0].id);
  const [testingTool, setTestingTool] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    result: string;
    durationMs: number;
    tokenSavingsPct: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!restaurantId) return;

    getApiKeysAction(restaurantId)
      .then((data) => {
        if (isMounted) {
          setKeys(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://minerva-flow.vercel.app";
  const mcpUrl = `${origin}/api/mcp`;
  const openApiUrl = `${origin}/api/openapi.json`;
  const activeKeyPlaceholder = keys.find((k) => !k.revoked)?.keyPrefix || "votre_cle_mcp_ici";

  function copyText(text: string, identifier: string, feedbackLabel: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    toast.success(`${feedbackLabel} copié dans le presse-papier !`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId || !newKeyName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createApiKeyAction(restaurantId, newKeyName.trim());
      if (res) {
        setCreatedRawToken(res.rawToken);
        setKeys((prev) => [res.apiKey, ...prev]);
        setNewKeyName("");
        toast.success("Nouvelle clé API générée avec succès !");
      } else {
        toast.error("Échec de la création de la clé.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!restaurantId) return;
    const ok = await revokeApiKeyAction(restaurantId, id);
    if (ok) {
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
      toast.success("Clé révoquée.");
    }
  }

  async function handleDeleteKey(id: string) {
    if (!restaurantId) return;
    const ok = await deleteApiKeyAction(restaurantId, id);
    if (ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("Clé supprimée.");
    }
  }

  async function handleRunTest() {
    if (!restaurantId) return;
    setTestingTool(true);
    try {
      const res = await testMcpToolAction(restaurantId, selectedTool);
      setTestResult(res);
      if (res.ok) toast.success("Test MCP exécuté avec succès !");
    } finally {
      setTestingTool(false);
    }
  }

  // Generate client snippet
  const clientConfigSnippet = useMemo(() => {
    switch (connectClient) {
      case "composio":
        return `# 🚀 Intégration 1-Clic dans Composio :
1. Allez dans Composio > "Tools" > "Add Custom Tool" (ou "Import OpenAPI").
2. Collez l'URL de Spécification OpenAPI :
   ${openApiUrl}
3. Choisissez l'authentification "API Key" ou "Bearer Token" et collez votre clé :
   ${createdRawToken || activeKeyPlaceholder}
4. ✅ Composio active instantanément les 25 outils en direct sur votre base Supabase !`;
      case "claude":
        return JSON.stringify(
          {
            mcpServers: {
              "minerva-flow": {
                command: "npx",
                args: [
                  "-y",
                  "mcp-remote",
                  mcpUrl,
                  "--header",
                  `Authorization: Bearer ${createdRawToken || activeKeyPlaceholder}`,
                ],
              },
            },
          },
          null,
          2
        );
      case "cursor":
        return JSON.stringify(
          {
            mcpServers: {
              "minerva-flow": {
                url: mcpUrl,
                headers: {
                  Authorization: `Bearer ${createdRawToken || activeKeyPlaceholder}`,
                },
              },
            },
          },
          null,
          2
        );
      case "antigravity":
        return JSON.stringify(
          {
            mcpServers: {
              "minerva-flow": {
                serverUrl: mcpUrl,
                apiKey: createdRawToken || activeKeyPlaceholder,
              },
            },
          },
          null,
          2
        );
      case "curl":
        return `curl -X POST ${origin}/api/v1/restaurant/summary \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${
          createdRawToken || activeKeyPlaceholder
        }"`;
      default:
        return "";
    }
  }, [connectClient, openApiUrl, mcpUrl, origin, createdRawToken, activeKeyPlaceholder]);

  return (
    <div className="space-y-6">
      {/* 1. Ultra Simple 3-Step Hero Connection Card */}
      <div className="relative overflow-hidden rounded-2xl border border-mv-green/30 bg-gradient-to-br from-mv-green-tint via-mv-surface to-mv-cream-soft p-6 shadow-mv-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mv-border-soft pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="green" size="sm" dot pulse>
                Serveur MCP & OpenAPI Actifs
              </Badge>
              <span className="text-[12px] font-mono text-mv-ink-soft">v1.2.0 · Live Supabase</span>
            </div>
            <h3 className="mt-2 font-display text-[22px] font-semibold text-mv-ink leading-tight">
              Connectez votre IA en 3 étapes simples
            </h3>
            <p className="mt-1 text-[13.5px] text-mv-ink-soft">
              Branchez Claude Desktop, Cursor, Composio ou votre agent autonome en moins de 30 secondes.
            </p>
          </div>

          <Button
            size="md"
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 gap-2 shadow-mv-sm"
          >
            <Plus size={16} /> Générer une clé API
          </Button>
        </div>

        {/* 3 Simple Visual Steps */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="rounded-xl border border-mv-border bg-white/80 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-green text-white text-[12px] font-bold">
                1
              </span>
              <span className="text-[11.5px] font-semibold text-mv-green-dark">Identifiant & Clé</span>
            </div>
            <h4 className="font-semibold text-[14px] text-mv-ink">Copiez votre Clé d&apos;Accès</h4>
            <p className="text-[12px] text-mv-ink-soft">
              Utilisez la clé ci-dessous ou générez-en une nouvelle avec le bouton ci-dessus.
            </p>
            <button
              type="button"
              onClick={() => copyText(createdRawToken || activeKeyPlaceholder, "step1-key", "Clé API")}
              className="mt-2 flex w-full items-center justify-between rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3 py-2 text-[12px] font-mono text-mv-ink hover:border-mv-green transition-colors"
            >
              <span className="truncate">{createdRawToken || activeKeyPlaceholder}</span>
              {copiedKey === "step1-key" ? <Check size={14} className="text-mv-green shrink-0 ml-2" /> : <Copy size={14} className="text-mv-ink-soft shrink-0 ml-2" />}
            </button>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-mv-border bg-white/80 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-green text-white text-[12px] font-bold">
                2
              </span>
              <span className="text-[11.5px] font-semibold text-mv-green-dark">Lien OpenAPI (Composio)</span>
            </div>
            <h4 className="font-semibold text-[14px] text-mv-ink">URL OpenAPI Spécification</h4>
            <p className="text-[12px] text-mv-ink-soft">
              À coller dans Composio (&ldquo;Import OpenAPI&rdquo;) ou dans un Custom GPT.
            </p>
            <button
              type="button"
              onClick={() => copyText(openApiUrl, "step2-openapi", "URL OpenAPI")}
              className="mt-2 flex w-full items-center justify-between rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3 py-2 text-[12px] font-mono text-mv-ink hover:border-mv-green transition-colors"
            >
              <span className="truncate">{openApiUrl}</span>
              {copiedKey === "step2-openapi" ? <Check size={14} className="text-mv-green shrink-0 ml-2" /> : <Copy size={14} className="text-mv-ink-soft shrink-0 ml-2" />}
            </button>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-mv-border bg-white/80 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-green text-white text-[12px] font-bold">
                3
              </span>
              <span className="text-[11.5px] font-semibold text-mv-green-dark">Endpoint MCP Remote</span>
            </div>
            <h4 className="font-semibold text-[14px] text-mv-ink">URL Serveur MCP (Claude)</h4>
            <p className="text-[12px] text-mv-ink-soft">
              Pour Claude Desktop, Cursor, Windsurf ou Antigravity via SSE/JSON-RPC.
            </p>
            <button
              type="button"
              onClick={() => copyText(mcpUrl, "step3-mcp", "URL Serveur MCP")}
              className="mt-2 flex w-full items-center justify-between rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3 py-2 text-[12px] font-mono text-mv-ink hover:border-mv-green transition-colors"
            >
              <span className="truncate">{mcpUrl}</span>
              {copiedKey === "step3-mcp" ? <Check size={14} className="text-mv-green shrink-0 ml-2" /> : <Copy size={14} className="text-mv-ink-soft shrink-0 ml-2" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. One-Click Snippet Generator with Tabs */}
      <Card>
        <CardHeader
          eyebrow="Configuration Prête à l'Emploi"
          title="Sélectionnez votre Plateforme IA"
          description="Cliquez sur votre outil pour copier instantanément la configuration complète."
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-mv-border-soft pb-3">
            <button
              type="button"
              onClick={() => setConnectClient("composio")}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                connectClient === "composio"
                  ? "bg-mv-green-dark text-white shadow-sm"
                  : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream"
              }`}
            >
              🚀 Composio (OpenAPI)
            </button>
            <button
              type="button"
              onClick={() => setConnectClient("claude")}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                connectClient === "claude"
                  ? "bg-mv-ink text-mv-cream shadow-sm"
                  : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Claude Desktop
            </button>
            <button
              type="button"
              onClick={() => setConnectClient("cursor")}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                connectClient === "cursor"
                  ? "bg-mv-ink text-mv-cream shadow-sm"
                  : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Cursor / Windsurf
            </button>
            <button
              type="button"
              onClick={() => setConnectClient("antigravity")}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                connectClient === "antigravity"
                  ? "bg-mv-ink text-mv-cream shadow-sm"
                  : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Antigravity IDE
            </button>
            <button
              type="button"
              onClick={() => setConnectClient("curl")}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                connectClient === "curl"
                  ? "bg-mv-ink text-mv-cream shadow-sm"
                  : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream"
              }`}
            >
              cURL / REST
            </button>
          </div>

          <div className="relative rounded-2xl bg-[#0E1318] p-5 text-[#E6EDF3] font-mono text-[12.5px] overflow-x-auto shadow-inner border border-gray-800">
            <div className="absolute top-3.5 right-3.5">
              <button
                type="button"
                onClick={() => copyText(clientConfigSnippet, "main-snippet", "Configuration")}
                className="flex items-center gap-1.5 rounded-lg bg-mv-green px-3 py-1.5 text-[12px] font-sans font-semibold text-white hover:bg-mv-green-dark transition-colors shadow-sm"
              >
                {copiedKey === "main-snippet" ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey === "main-snippet" ? "Copié !" : "Copier la configuration"}
              </button>
            </div>
            <pre className="pt-2 whitespace-pre-wrap leading-relaxed">{clientConfigSnippet}</pre>
          </div>
        </div>
      </Card>

      {/* 3. API Keys Management Card */}
      <Card>
        <CardHeader
          eyebrow="Sécurité & Révocation"
          title="Vos Clés d'Accès Actives"
          description="Gérez les autorisations accordées à vos différents clients ou bots autonomes."
          action={
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus size={14} /> Nouvelle clé
            </Button>
          }
        />

        {createdRawToken && (
          <div className="mb-4 rounded-xl border border-mv-green/40 bg-mv-green-tint p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-mv-green-darker flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-mv-green" /> Clé API prête — Copiez-la maintenant :
              </span>
              <button
                type="button"
                onClick={() => copyText(createdRawToken, "just-created", "Clé API")}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-mv-green-dark hover:underline"
              >
                {copiedKey === "just-created" ? <Check size={13} /> : <Copy size={13} />}
                {copiedKey === "just-created" ? "Copié" : "Copier la clé"}
              </button>
            </div>
            <p className="font-mono text-[12.5px] bg-white/90 p-2.5 rounded-lg text-mv-ink font-semibold break-all border border-mv-green/20">
              {createdRawToken}
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-[13px] text-mv-ink-faint">Chargement des clés…</p>
        ) : keys.length === 0 ? (
          <p className="text-[13px] text-mv-ink-faint">Aucune clé API configurée pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2.5">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-[12.5px] transition-colors ${
                  k.revoked ? "border-mv-border-soft bg-mv-cream-soft/40 opacity-60" : "border-mv-border bg-mv-surface"
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-mv-ink">{k.name}</span>
                    {k.isEnvKey && <Badge tone="purple" size="xs">Système .env</Badge>}
                    {k.revoked ? (
                      <Badge tone="red" size="xs">Révoquée</Badge>
                    ) : (
                      <Badge tone="green" size="xs">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11.5px] text-mv-ink-soft">
                    <span>{k.keyPrefix}</span>
                    {k.lastUsedAt && (
                      <span className="text-[11px] text-mv-ink-faint font-sans">
                        · Utilisée {formatRelativeTime(k.lastUsedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {!k.isEnvKey && !k.revoked && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRevokeKey(k.id)}
                      className="rounded-lg border border-mv-border px-2.5 py-1 text-[11.5px] font-semibold text-mv-ink-soft hover:text-mv-amber hover:border-mv-amber/40 transition-colors"
                    >
                      Révoquer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(k.id)}
                      className="p-1.5 text-mv-ink-faint hover:text-mv-red transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Live MCP Diagnostic & Tester Card */}
      <Card>
        <CardHeader
          eyebrow="Diagnostic & Validation Live"
          title="Testeur d'Outils en Direct (Zéro Mock)"
          description="Exécutez une action réelle sur la base Supabase pour valider la connectivité et la latence."
        />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <Field label="Choisir une action à tester">
                <Select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
                  {AVAILABLE_TOOLS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button onClick={handleRunTest} disabled={testingTool} className="gap-2">
              <Play size={14} />
              {testingTool ? "Exécution en cours…" : "Tester en direct"}
            </Button>
          </div>

          {testResult && (
            <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={testResult.ok ? "green" : "red"}>
                    {testResult.ok ? "200 OK" : "Erreur"}
                  </Badge>
                  <span className="text-[12px] text-mv-ink-soft flex items-center gap-1">
                    <Clock size={12} /> {testResult.durationMs} ms
                  </span>
                </div>
                {testResult.tokenSavingsPct > 0 && (
                  <Badge tone="lime" size="xs">
                    ⚡ {testResult.tokenSavingsPct}% économie de tokens
                  </Badge>
                )}
              </div>
              <div className="rounded-lg bg-white p-3 font-mono text-[11.5px] text-mv-ink overflow-x-auto border border-mv-border-soft max-h-60">
                <pre>{testResult.result}</pre>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* New Key Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer une clé API"
        description="Donnez un nom clair pour identifier l'agent ou le service qui utilisera cette clé."
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <Field label="Nom de la clé / Client">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Ex : Composio Agent, Claude Desktop, Hermes"
              required
              autoFocus
            />
          </Field>

          <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !newKeyName.trim()}>
              {isSubmitting ? "Génération…" : "Générer la clé"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
