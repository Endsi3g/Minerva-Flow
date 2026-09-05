"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import type {
  ChatArtifact,
  ChatConversation,
  ChatMessage,
  ChatProjectFolder,
} from "@/lib/types";
import type { CanvasContextData } from "@/components/chat/CanvasDefaultContext";
import { getSpecialistById } from "@/lib/ai/specialists";
import { DEFAULT_DOSSIERS } from "@/lib/ai/dossier-types";
import {
  executeTogglePinAction,
  executeDeleteSessionAction,
  executeCreateProjectFolderAction,
} from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import {
  Brain,
  Sparkles,
  Bot,
  Settings,
  Folder,
  FolderPlus,
  Plus,
  Layers,
  Trash2,
  Pin,
  PinOff,
  History,
  PanelLeftClose,
  PanelLeft,
  Bell,
  ArrowLeftRight,
  BookOpen,
  BarChart2,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";

function toUIMessages(messages: ChatMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

export function AssistantChatView({
  restaurantId,
  conversationId,
  conversations: initialConversations,
  initialMessages,
  initialArtifact,
  defaultContext,
  initialAgentId = "general",
  initialActiveDossiers = ["menu", "finance", "loyalty", "operations"],
  projectFolders: initialProjectFolders = [],
  onHold = false,
}: {
  restaurantId: string;
  conversationId: string;
  conversations: ChatConversation[];
  initialMessages: ChatMessage[];
  initialArtifact: ChatArtifact | null;
  defaultContext: CanvasContextData;
  initialAgentId?: string;
  initialActiveDossiers?: string[];
  projectFolders?: ChatProjectFolder[];
  /** Flow AI kill switch (lib/ai/config.ts) — page stays reachable, sending is blocked. */
  onHold?: boolean;
}) {
  const router = useRouter();
  const { authUser } = useApp();
  const userName = authUser?.fullName || "Directeur d'exploitation";
  const userInitials = authUser?.fullName
    ? authUser.fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "K";

  // State
  const [conversations, setConversations] = useState<ChatConversation[]>(initialConversations);
  const [projectFolders, setProjectFolders] = useState<ChatProjectFolder[]>(initialProjectFolders);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Panels visibility — exactly matching Image 2
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("Gemini 3.7");

  const [agentId, setAgentId] = useState(initialAgentId);
  const [activeDossiers, setActiveDossiers] = useState<string[]>(initialActiveDossiers);

  // Dialogs
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // Assistant runtime
  const runtime = useChatRuntime({
    id: conversationId,
    messages: toUIMessages(initialMessages),
    transport: new AssistantChatTransport({
      api: "/api/ai/chat",
      body: {
        restaurantId,
        conversationId,
        agentId,
        activeDossiers,
      },
    }),
  });

  // Current session
  const currentSession = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId]
  );

  // Filtered sessions based on selected project
  const filteredSessions = useMemo(() => {
    return conversations;
  }, [conversations]);

  // Keyboard shortcut Cmd+B (Workspace)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsWorkspaceOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handlers
  const handleTogglePin = async (e: React.MouseEvent, sessId: string, currentPin: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !currentPin;
    setConversations((prev) =>
      prev.map((c) => (c.id === sessId ? { ...c, isPinned: next } : c))
    );
    await executeTogglePinAction(sessId, next);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== sessId));
    await executeDeleteSessionAction(sessId);
    if (sessId === conversationId) {
      router.push("/assistant");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const res = await executeCreateProjectFolderAction({
      restaurantId,
      name: newFolderName.trim(),
      description: newFolderDesc.trim(),
    });
    if (res.success && res.folder) {
      setProjectFolders((prev) => [res.folder!, ...prev]);
      setShowNewFolderModal(false);
      setNewFolderName("");
      setNewFolderDesc("");
      toast.success("Dossier de projet créé.");
    } else {
      toast.error(res.error || "Erreur lors de la création du dossier.");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans">
      {/* ── 1. RAIL DE NAVIGATION GAUCHE (Image 2 — 240px) ──────────────────── */}
      <aside className="w-[240px] shrink-0 border-r border-[#e5e5e0] bg-[#f4f4f3] flex flex-col h-full select-none">
        {/* Brand Header */}
        <div className="flex h-12 items-center justify-between border-b border-[#e5e5e0] px-4">
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-[#26251e] min-w-0">
            <div className="h-5 w-5 rounded-md bg-[#059669] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="truncate">Minerva Flow</span>
            <span className="text-[9px] font-bold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              AI
            </span>
          </div>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Platform switch link */}
          <Link
            href="/overview"
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] hover:text-[#059669] px-2 py-1.5 rounded-md hover:bg-[#e5e5e2]/60 transition-colors mb-2"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
            <span>Minerva Flow</span>
          </Link>

          {/* Core AI Links */}
          <Link
            href="/assistant"
            className="flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md bg-white text-[#26251e] shadow-xs border border-[#e5e5e0] transition-colors"
          >
            <Brain className="h-4 w-4 text-[#059669] shrink-0" strokeWidth={2} />
            <span>Assistant</span>
          </Link>

          <Link
            href="/assistant/agents"
            className="flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
          >
            <Bot className="h-4 w-4 text-[#555552] opacity-70 shrink-0" strokeWidth={1.5} />
            <span>Agents Store</span>
          </Link>

          <Link
            href="/assistant/skills"
            className="flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
          >
            <BookOpen className="h-4 w-4 text-[#555552] opacity-70 shrink-0" strokeWidth={1.5} />
            <span>Capacités (Skills)</span>
          </Link>

          <Link
            href="/assistant/intelligence"
            className="flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
          >
            <BarChart2 className="h-4 w-4 text-[#555552] opacity-70 shrink-0" strokeWidth={1.5} />
            <span>Intelligence</span>
          </Link>

          {/* Section Historique des Discussions Réelles */}
          <div className="mt-4 pt-3 border-t border-[#e5e5e0]/70 space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              Historique
            </div>

            <Link
              href="/assistant"
              className="flex items-center justify-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#059669] bg-[#059669]/10 border border-[#059669]/20 rounded-md hover:bg-[#059669]/15 transition-all w-full mb-2"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Nouvelle conversation</span>
            </Link>

            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
              {conversations.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-[#807d72] italic">
                  Aucune discussion
                </div>
              ) : (
                conversations.map((sess) => {
                  const isActive = sess.id === conversationId;
                  return (
                    <div
                      key={sess.id}
                      className={cn(
                        "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all cursor-pointer",
                        isActive
                          ? "bg-[#059669]/10 text-[#059669] font-semibold"
                          : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
                      )}
                    >
                      {sess.isPinned && <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                      <Link href={`/assistant/${sess.id}`} className="flex-1 truncate">
                        {sess.title || "Nouvel échange Flow AI"}
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, sess.id, !!sess.isPinned)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#e5e5e2] text-neutral-400 hover:text-amber-500 transition-all cursor-pointer"
                        title={sess.isPinned ? "Détacher" : "Épingler"}
                      >
                        {sess.isPinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-neutral-400 hover:text-red-600 transition-all cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-[#e5e5e0] px-3 py-2.5">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 text-xs font-semibold px-2 py-1.5 rounded-md text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
          >
            <Settings className="h-4 w-4 text-[#7a7a76]" />
            <span>Paramètres</span>
          </Link>
        </div>
      </aside>

      {/* ── 2. SECOND PANNEAU: WORKSPACE & PROJETS (Image 2 — 256px) ─────────── */}
      {isWorkspaceOpen && (
        <aside className="w-64 shrink-0 border-r border-[#e6e5e0]/60 bg-[#fafaf9] flex flex-col h-full select-none animate-in fade-in slide-in-from-left-2 duration-200">
          {/* Header */}
          <div className="h-12 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between shrink-0 bg-[#fafaf9]">
            <div className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-[#059669]" />
              <span className="text-[10px] font-extrabold text-[#26251e] tracking-wider uppercase">
                Workspace & Projets
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(true)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-[#7a7a76] hover:text-[#059669] hover:bg-emerald-50 transition-colors cursor-pointer"
                title="Nouveau Dossier / Projet"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <Link
                href="/assistant"
                className="h-7 w-7 rounded-full flex items-center justify-center text-[#7a7a76] hover:text-[#059669] hover:bg-emerald-50 transition-colors cursor-pointer"
                title="Nouvelle conversation"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
            {/* DOSSIERS & PROJETS */}
            <div className="space-y-1">
              <div className="px-2 flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#7a7a76] uppercase tracking-wider">
                  Dossiers & Projets
                </span>
                {selectedProjectId && (
                  <button
                    onClick={() => setSelectedProjectId(null)}
                    className="text-[9px] text-[#059669] hover:underline font-bold cursor-pointer"
                  >
                    Voir tout
                  </button>
                )}
              </div>

              {/* Tous les projets */}
              <div
                onClick={() => setSelectedProjectId(null)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-[11px] font-semibold transition-all",
                  selectedProjectId === null
                    ? "bg-emerald-50/80 text-emerald-900 border border-emerald-200/50"
                    : "text-[#555552] hover:bg-neutral-100 hover:text-[#26251e]"
                )}
              >
                <Layers className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span className="flex-1 truncate">Tous les projets</span>
                <span className="text-[10px] text-[#7a7a76] font-mono">
                  {conversations.length}
                </span>
              </div>

              {/* 5 RAG Context Dossiers */}
              {DEFAULT_DOSSIERS.map((dos) => {
                const isActive = activeDossiers.includes(dos.slug);
                return (
                  <div
                    key={dos.slug}
                    onClick={() => {
                      setActiveDossiers((prev) =>
                        prev.includes(dos.slug)
                          ? prev.filter((s) => s !== dos.slug)
                          : [...prev, dos.slug]
                      );
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-[11px] font-medium transition-all group",
                      isActive
                        ? "text-[#26251e] bg-white border border-[#e6e5e0] shadow-2xs font-semibold"
                        : "text-[#7a7a76] hover:bg-neutral-100 hover:text-[#26251e]"
                    )}
                    title={dos.description}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        isActive ? "bg-[#059669]" : "bg-neutral-300"
                      )}
                    />
                    <span className="flex-1 truncate">{dos.name}</span>
                    <span className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isActive ? "RAG actif" : "Désactivé"}
                    </span>
                  </div>
                );
              })}

              {/* Custom Project Folders */}
              {projectFolders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() =>
                    setSelectedProjectId((cur) => (cur === folder.id ? null : folder.id))
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-[11px] font-semibold transition-all",
                    selectedProjectId === folder.id
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "text-[#555552] hover:bg-neutral-100 hover:text-[#26251e]"
                  )}
                >
                  <Folder className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                  <span className="flex-1 truncate">{folder.name}</span>
                </div>
              ))}
            </div>

            {/* DISCUSSIONS */}
            <div className="space-y-1 pt-1">
              <div className="px-2 flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#7a7a76] uppercase tracking-wider">
                  Discussions
                </span>
                {selectedProjectId && (
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-mono">
                    Filtré
                  </span>
                )}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-[#807d72] italic">
                  Aucune discussion
                </div>
              ) : (
                filteredSessions.slice(0, 8).map((sess) => {
                  const isActive = sess.id === conversationId;
                  return (
                    <Link
                      key={sess.id}
                      href={`/assistant/${sess.id}`}
                      className={cn(
                        "block rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all truncate",
                        isActive
                          ? "bg-emerald-50/80 text-emerald-900 font-semibold"
                          : "text-[#555552] hover:bg-neutral-100 hover:text-[#26251e]"
                      )}
                    >
                      {sess.title || "Nouvel échange Flow AI"}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      )}

      {/* ── 3. COLONNE CENTRALE : CHAT ASSISTANT & HERO (Image 2) ─────────────── */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-white relative overflow-hidden">
        {/* Top bar avec Breadcrumb, bouton toggle et profil */}
        <header className="h-12 border-b border-[#e5e5e0] px-4 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWorkspaceOpen((v) => !v)}
              className={cn(
                "h-7 w-7 rounded-md flex items-center justify-center text-[#7a7a76] hover:text-[#059669] hover:bg-[#f4f4f3] transition-colors cursor-pointer border border-transparent",
                isWorkspaceOpen && "text-[#059669]"
              )}
              title={isWorkspaceOpen ? "Masquer le workspace" : "Afficher le workspace"}
            >
              {isWorkspaceOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>
            <span className="text-xs font-bold text-[#26251e]">Assistant</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#e5e5e0] bg-[#fafaf9] text-xs font-semibold text-[#26251e]">
              <ArrowLeftRight className="h-3 w-3 text-[#059669]" />
              <span>Minerva Flow</span>
            </div>

            <button
              type="button"
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#7a7a76] hover:text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
              title="Notifications"
            >
              <Bell size={15} />
            </button>

            <div className="h-8 w-8 rounded-full bg-[#059669]/15 text-[#059669] border border-[#059669]/30 flex items-center justify-center text-xs font-bold font-mono">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Sub-header inside Chat Area */}
        <div className="h-10 border-b border-[#e6e5e0]/60 px-4 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-3.5 h-3.5 text-[#7a7a76]" />
            <div className="h-5 w-5 rounded-md bg-[#059669] flex items-center justify-center text-white shrink-0">
              <Sparkles className="h-2.5 w-2.5" />
            </div>
            <span className="text-xs font-bold text-[#26251e] truncate">
              Minerva Flow Assistant
            </span>
            {currentSession?.title && (
              <span className="text-[10px] text-[#7a7a76] font-medium border-l border-neutral-200 pl-2 truncate max-w-[200px]">
                {currentSession.title}
              </span>
            )}
          </div>

          <Link
            href="/assistant"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#7a7a76] hover:text-[#059669] px-2 py-1 rounded-md hover:bg-[#f4f4f3] transition-colors"
          >
            <Plus size={13} />
            <span>Nouveau</span>
          </Link>
        </div>

        {/* Zone de chat active avec Thread et Claude-style composer */}
        <div className="relative flex-1 overflow-hidden min-h-0">
          {onHold && (
            <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] font-medium text-amber-900">
              <Bell size={14} className="shrink-0 text-amber-600" />
              Flow AI est temporairement en pause — l&apos;historique reste consultable, mais l&apos;envoi de
              messages est désactivé pour le moment.
            </div>
          )}
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread
              userName={userName}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          </AssistantRuntimeProvider>
          {onHold && (
            <div
              className="absolute inset-0 z-20 cursor-not-allowed bg-[#fbf9f4]/40"
              onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.info("Flow AI est en pause pour le moment — revenez bientôt.");
              }}
            />
          )}
        </div>
      </main>

      {/* ── Modal Nouveau Dossier Projet ────────────────────────────────────── */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#26251e]">
              Nouveau Dossier / Projet
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-[#7a7a76] uppercase tracking-wider block mb-1">
                Nom du Dossier
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Rénovation Carte Printemps"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e0e0dc] focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#7a7a76] uppercase tracking-wider block mb-1">
                Description (Optionnelle)
              </label>
              <textarea
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="Objectifs et périmètre du dossier..."
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e0e0dc] focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewFolderModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#059669] hover:bg-[#047857] text-white"
              >
                Créer le dossier
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
