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
  ShieldCheck,
  Play,
  Clock,
  Sparkles,
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
  const [copiedText, setCopiedText] = useState<string | null>(null);

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

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopiedText(null), 2000);
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
1. Dans votre Dashboard Composio, allez dans "Tools" > "Add Custom Tool" (ou "Import OpenAPI").
2. Collez l'URL de Spécification OpenAPI ci-dessous :
   ${openApiUrl}
3. Choisissez l'authentification "API Key" ou "Bearer Token" et collez :
   ${createdRawToken || activeKeyPlaceholder}
4. Composio importera automatiquement les 24 outils de gestion, prospection et fidélisation !`;
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
      {/* 1. MCP & OpenAPI Endpoints Status */}
      <Card>
        <CardHeader
          eyebrow="Connectivité & Protocoles"
          title="Serveur MCP & Spécification OpenAPI"
          description="Endpoints sécurisés pour connecter Composio, Claude Desktop, Cursor ou tout agent IA à votre restaurant."
          action={
            <Badge tone="green" size="sm" dot pulse>
              Actif · Token-Efficient
            </Badge>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-mv-ink flex items-center gap-1.5">
                <Sparkles size={13} className="text-mv-green-dark" /> Spécification OpenAPI (Composio) :
              </span>
              <button
                onClick={() => copyToClipboard(openApiUrl, "URL OpenAPI")}
                className="inline-flex items-center gap-1 text-mv-green-dark hover:underline font-medium"
              >
                {copiedText === "URL OpenAPI" ? <Check size={12} /> : <Copy size={12} />}
                {copiedText === "URL OpenAPI" ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="truncate font-mono text-[11px] bg-white p-2 rounded-lg border border-mv-border-soft text-mv-ink">
              {openApiUrl}
            </p>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-mv-ink">Serveur MCP Remote URL :</span>
              <button
                onClick={() => copyToClipboard(mcpUrl, "URL Serveur MCP")}
                className="inline-flex items-center gap-1 text-mv-green-dark hover:underline font-medium"
              >
                {copiedText === "URL Serveur MCP" ? <Check size={12} /> : <Copy size={12} />}
                {copiedText === "URL Serveur MCP" ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="truncate font-mono text-[11px] bg-white p-2 rounded-lg border border-mv-border-soft text-mv-ink">
              {mcpUrl}
            </p>
          </div>

          <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-mv-ink">Webhook Minerva Reach :</span>
              <button
                onClick={() => copyToClipboard(`${origin}/api/leads/reach-webhook`, "Webhook Reach")}
                className="inline-flex items-center gap-1 text-mv-green-dark hover:underline font-medium"
              >
                {copiedText === "Webhook Reach" ? <Check size={12} /> : <Copy size={12} />}
                {copiedText === "Webhook Reach" ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="truncate font-mono text-[11px] bg-white p-2 rounded-lg border border-mv-border-soft text-mv-ink">
              {origin}/api/leads/reach-webhook
            </p>
          </div>
        </div>
      </Card>

      {/* 2. API Keys Management */}
      <Card>
        <CardHeader
          eyebrow="Sécurité & Accès"
          title="Clés API d'Authentification"
          description="Chaque agent ou intégration externe utilise une clé pour exécuter des actions opérationnelles."
          action={
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus size={14} /> Nouvelle clé API
            </Button>
          }
        />

        {createdRawToken && (
          <div className="mb-4 rounded-xl border border-mv-green/30 bg-mv-green-tint p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-mv-green-darker flex items-center gap-1.5">
                <ShieldCheck size={15} /> Clé API générée — Copiez-la maintenant :
              </span>
              <button
                onClick={() => copyToClipboard(createdRawToken, "Clé API")}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-mv-green-dark hover:underline"
              >
                {copiedText === "Clé API" ? <Check size={13} /> : <Copy size={13} />}
                {copiedText === "Clé API" ? "Copié" : "Copier la clé"}
              </button>
            </div>
            <p className="font-mono text-[12px] bg-white/80 p-2.5 rounded-lg text-mv-ink font-semibold break-all">
              {createdRawToken}
            </p>
            <p className="text-[11px] text-mv-green-dark">
              ⚠️ Pour votre sécurité, cette clé secrète ne sera plus jamais réaffichée en clair.
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">Chargement des clés…</p>
        ) : keys.length === 0 ? (
          <p className="text-[12.5px] text-mv-ink-faint">Aucune clé API configurée pour l&apos;instant.</p>
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
                      onClick={() => handleRevokeKey(k.id)}
                      className="rounded-lg border border-mv-border px-2.5 py-1 text-[11.5px] font-semibold text-mv-ink-soft hover:text-mv-amber hover:border-mv-amber/40 transition-colors"
                    >
                      Révoquer
                    </button>
                    <button
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

      {/* 3. Quick Connect Guides */}
      <Card>
        <CardHeader
          eyebrow="Intégrations Clients"
          title="Guides de Connexion Rapide (1-Clic)"
          description="Copiez la configuration prête à l'emploi pour Composio, Claude Desktop ou vos agents IA."
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-mv-border-soft pb-3">
            <button
              onClick={() => setConnectClient("composio")}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                connectClient === "composio" ? "bg-mv-green-dark text-white" : "bg-mv-cream-soft text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Composio (OpenAPI)
            </button>
            <button
              onClick={() => setConnectClient("claude")}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                connectClient === "claude" ? "bg-mv-ink text-mv-cream" : "bg-mv-cream-soft text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setConnectClient("cursor")}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                connectClient === "cursor" ? "bg-mv-ink text-mv-cream" : "bg-mv-cream-soft text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Cursor / Windsurf
            </button>
            <button
              onClick={() => setConnectClient("antigravity")}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                connectClient === "antigravity" ? "bg-mv-ink text-mv-cream" : "bg-mv-cream-soft text-mv-ink hover:bg-mv-cream"
              }`}
            >
              Antigravity IDE
            </button>
            <button
              onClick={() => setConnectClient("curl")}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                connectClient === "curl" ? "bg-mv-ink text-mv-cream" : "bg-mv-cream-soft text-mv-ink hover:bg-mv-cream"
              }`}
            >
              cURL / REST
            </button>
          </div>

          <div className="relative rounded-xl bg-[#0C1117] p-4 text-[#C9D1D9] font-mono text-[12px] overflow-x-auto shadow-inner">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => copyToClipboard(clientConfigSnippet, "Guide / Config")}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11.5px] font-sans font-medium text-white hover:bg-white/20 transition-colors"
              >
                {copiedText === "Guide / Config" ? <Check size={12} /> : <Copy size={12} />}
                {copiedText === "Guide / Config" ? "Copié !" : "Copier"}
              </button>
            </div>
            <pre className="pt-2 whitespace-pre-wrap">{clientConfigSnippet}</pre>
          </div>
        </div>
      </Card>

      {/* 4. Interactive MCP Tool Tester */}
      <Card>
        <CardHeader
          eyebrow="Diagnostic & Test Direct"
          title="Testeur d'Outils MCP en Direct"
          description="Exécutez un appel d'outil MCP en direct pour vérifier la connectivité et mesurer l'économie de tokens."
        />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <Field label="Choisir un outil MCP à tester">
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
              {testingTool ? "Exécution…" : "Tester l'outil"}
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
        title="Créer une clé API MCP"
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
