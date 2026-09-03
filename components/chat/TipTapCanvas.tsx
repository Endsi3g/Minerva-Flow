"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Save,
  Download,
  Copy,
  Check,
  FileText,
  Utensils,
  TrendingUp,
  ClipboardList,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { executeCanvasSaveAction } from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import type { ChatCanvasDoc } from "@/lib/types";

// ── Modèles pré-remplis de restauration ─────────────────────────────────────
const RESTAURANT_TEMPLATES = {
  recipe: `<h2>Fiche Technique : Saumon Rôti & Émulsion Citronnée</h2>
<p><strong>Catégorie :</strong> Plat Principal · <strong>Portion :</strong> 1 personne</p>
<hr/>
<h3>1. Ingrédients & Coûts Matières</h3>
<ul>
  <li>Pavé de saumon frais (180g) : <strong>4,20 $</strong></li>
  <li>Beurre blanc citronné (40g) : <strong>0,85 $</strong></li>
  <li>Légumes de saison rôtis (150g) : <strong>1,10 $</strong></li>
  <li>Assaisonnements & herbes fraîches : <strong>0,25 $</strong></li>
</ul>
<p><strong>Coût Matière Total (Food Cost) :</strong> 6,40 $</p>
<p><strong>Prix de Vente Conseillé :</strong> 22,00 $ (Ratio Food Cost : <strong>29,1 %</strong> · Marge unitaire : <strong>15,60 $</strong>)</p>
<hr/>
<h3>2. Protocole de Dressage</h3>
<p>Dresser le lit de légumes rôtis au centre de l'assiette chaude. Déposer le pavé de saumon croustillant peau vers le haut. Napper délicatement d'émulsion citronnée en cordon.</p>`,

  pricing_sim: `<h2>Simulation de Rentabilité : Révision de Carte Automne</h2>
<p><em>Objectif opérationnel : Amener le Prime Cost global sous 58 % sans impacter le volume de couverts.</em></p>
<hr/>
<h3>Tableau de Recalibrage des Marges</h3>
<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
  <thead>
    <tr style="background-color: #F5F1E6; text-align: left;">
      <th style="padding: 8px; border: 1px solid #E6E0D0;">Plat</th>
      <th style="padding: 8px; border: 1px solid #E6E0D0;">Prix Actuel</th>
      <th style="padding: 8px; border: 1px solid #E6E0D0;">Nouveau Prix</th>
      <th style="padding: 8px; border: 1px solid #E6E0D0;">Food Cost %</th>
      <th style="padding: 8px; border: 1px solid #E6E0D0;">Gain Marge/Mois</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">Burger Signature</td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">17,50 $</td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;"><strong>18,90 $</strong></td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">29,6 %</td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">+ 420 $</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">Tartare de Boeuf</td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">19,00 $</td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;"><strong>21,00 $</strong></td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">28,1 %</td>
      <td style="padding: 8px; border: 1px solid #E6E0D0;">+ 360 $</td>
    </tr>
  </tbody>
</table>
<p style="margin-top: 12px;"><strong>Impact combiné estimé :</strong> + 780 $ de marge nette mensuelle.</p>`,

  briefing: `<h2>Briefing de Service — Service du Soir</h2>
<p><strong>Date :</strong> ${new Date().toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })} · <strong>Responsable de quart :</strong> Chef de Rang</p>
<hr/>
<h3>1. Chiffres & Cadence Attendue</h3>
<ul>
  <li><strong>Objectif Ventes :</strong> 4 500 $</li>
  <li><strong>Réservations :</strong> 64 couverts (Pic attendu entre 19h30 et 20h45)</li>
  <li><strong>Table VIP :</strong> Table 12 (Client Privilégié, 8e visite)</li>
</ul>
<h3>2. Focus Vente Incitative (Suggestive Selling)</h3>
<p>Mettre en avant l'apéritif maison et la suggestion du sommelier sur le plat saumon.</p>
<h3>3. Postes & Rôles</h3>
<ul>
  <li><strong>Salle Rang A :</strong> Alexandre Tremblay</li>
  <li><strong>Salle Rang B :</strong> Sarah Gagnon</li>
  <li><strong>Bar & Boissons :</strong> Mathieu Lavoie</li>
  <li><strong>Passe & Clôture :</strong> Responsable de service</li>
</ul>`,
};

export function TipTapCanvas({
  restaurantId,
  conversationId,
  initialDoc,
  onDocSaved,
  onClose,
}: {
  restaurantId: string;
  conversationId?: string;
  initialDoc?: ChatCanvasDoc | null;
  onDocSaved?: (doc: ChatCanvasDoc) => void;
  onClose?: () => void;
}) {
  const [title, setTitle] = useState(initialDoc?.title ?? "Document de Synthèse");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(initialDoc?.id);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Rédigez ici votre recette, compte-rendu, briefing ou plan d'action d'exploitation...",
      }),
      CharacterCount,
    ],
    content: initialDoc?.content || RESTAURANT_TEMPLATES.briefing,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm md:prose-base max-w-none focus:outline-none min-h-[420px] px-6 py-6 font-sans text-mv-ink leading-relaxed",
      },
    },
  });

  // Écoute de l'événement global minerva_insert_canvas déclenché depuis le chat
  useEffect(() => {
    function handleInsertEvent(e: Event) {
      const customEvent = e as CustomEvent<{ content: string; title?: string }>;
      if (!editor || !customEvent.detail?.content) return;
      if (customEvent.detail.title) {
        setTitle(customEvent.detail.title);
      }
      editor.commands.insertContent(customEvent.detail.content);
      toast.success("Contenu inséré dans le Canvas !");
    }

    window.addEventListener("minerva_insert_canvas", handleInsertEvent);
    return () => window.removeEventListener("minerva_insert_canvas", handleInsertEvent);
  }, [editor]);

  // Sauvegarde manuelle ou automatique
  const handleSave = useCallback(async () => {
    if (!editor) return;
    setIsSaving(true);
    const htmlContent = editor.getHTML();
    const jsonContent = editor.getJSON() as Record<string, unknown>;

    const res = await executeCanvasSaveAction({
      id: currentDocId,
      restaurantId,
      conversationId,
      title,
      content: htmlContent,
      contentJson: jsonContent,
    });

    setIsSaving(false);
    if (res.success && res.doc) {
      setCurrentDocId(res.doc.id);
      setLastSavedTime(new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }));
      toast.success("Document Canvas enregistré dans Minerva Flow !");
      if (onDocSaved) onDocSaved(res.doc);
    } else {
      toast.error(res.error ?? "Erreur lors de l'enregistrement du Canvas");
    }
  }, [editor, currentDocId, restaurantId, conversationId, title, onDocSaved]);

  function handleCopyMarkdown() {
    if (!editor) return;
    const text = editor.getText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Texte copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadTxt() {
    if (!editor) return;
    const element = document.createElement("a");
    const file = new Blob([editor.getText()], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function loadTemplate(key: keyof typeof RESTAURANT_TEMPLATES) {
    if (!editor) return;
    editor.commands.setContent(RESTAURANT_TEMPLATES[key]);
    if (key === "recipe") setTitle("Fiche Technique — Saumon Rôti");
    if (key === "pricing_sim") setTitle("Simulation de Prix & Marges");
    if (key === "briefing") setTitle("Briefing de Service du Soir");
    toast.info("Modèle appliqué au Canvas.");
  }

  if (!editor) return null;

  return (
    <div
      className={cn(
        "flex flex-col bg-mv-surface border border-mv-border rounded-xl shadow-xs overflow-hidden transition-all duration-200",
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "h-full w-full"
      )}
    >
      {/* ── En-tête supérieur du Canvas ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mv-border bg-[#FAF7F0]">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
          <FileText size={16} className="text-mv-green-dark shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du document..."
            className="font-serif font-semibold text-[15px] text-mv-ink bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-mv-green rounded px-1.5 py-0.5 w-full truncate"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {lastSavedTime && (
            <span className="hidden sm:inline-block text-[11px] text-mv-ink-faint mr-2 font-mono">
              Enregistré à {lastSavedTime}
            </span>
          )}

          <Tooltip>
            <TooltipTrigger
              onClick={handleCopyMarkdown}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-mv-ink-soft hover:text-mv-ink hover:bg-mv-ink/5"
            >
              {copied ? <Check size={14} className="text-mv-green" /> : <Copy size={14} />}
            </TooltipTrigger>
            <TooltipContent>Copier le texte brut</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={handleDownloadTxt}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-mv-ink-soft hover:text-mv-ink hover:bg-mv-ink/5"
            >
              <Download size={14} />
            </TooltipTrigger>
            <TooltipContent>Télécharger le fichier (.txt)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-mv-ink-soft hover:text-mv-ink hover:bg-mv-ink/5"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? "Réduire" : "Plein écran"}</TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-3 bg-mv-green hover:bg-mv-green-dark text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save size={13} />
            {isSaving ? "Enregistrement..." : "Sauvegarder"}
          </Button>

          {onClose && (
            <Tooltip>
              <TooltipTrigger
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-mv-ink-soft hover:text-red-600 hover:bg-red-50 ml-1 transition-colors"
              >
                <X size={15} />
              </TooltipTrigger>
              <TooltipContent>Fermer le Canvas</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Toolbar TipTap Notion-like ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-mv-border-soft bg-white/70 backdrop-blur-xs text-mv-ink">
        <div className="flex items-center gap-0.5 border-r border-mv-border pr-1 mr-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("bold") && "bg-mv-cream text-mv-green-dark font-bold")}
          >
            <Bold size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("italic") && "bg-mv-cream text-mv-green-dark italic")}
          >
            <Italic size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("underline") && "bg-mv-cream text-mv-green-dark underline")}
          >
            <UnderlineIcon size={13} />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 border-r border-mv-border pr-1 mr-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("h-7 px-1.5 text-[11px] font-bold", editor.isActive("heading", { level: 1 }) && "bg-mv-cream text-mv-green-dark")}
          >
            H1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("h-7 px-1.5 text-[11px] font-bold", editor.isActive("heading", { level: 2 }) && "bg-mv-cream text-mv-green-dark")}
          >
            H2
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn("h-7 px-1.5 text-[11px] font-bold", editor.isActive("heading", { level: 3 }) && "bg-mv-cream text-mv-green-dark")}
          >
            H3
          </Button>
        </div>

        <div className="flex items-center gap-0.5 border-r border-mv-border pr-1 mr-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("bulletList") && "bg-mv-cream text-mv-green-dark")}
          >
            <List size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("orderedList") && "bg-mv-cream text-mv-green-dark")}
          >
            <ListOrdered size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("blockquote") && "bg-mv-cream text-mv-green-dark")}
          >
            <Quote size={13} />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 border-r border-mv-border pr-1 mr-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={cn("h-7 w-7 p-0", editor.isActive({ textAlign: "left" }) && "bg-mv-cream text-mv-green-dark")}
          >
            <AlignLeft size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={cn("h-7 w-7 p-0", editor.isActive({ textAlign: "center" }) && "bg-mv-cream text-mv-green-dark")}
          >
            <AlignCenter size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={cn("h-7 w-7 p-0", editor.isActive({ textAlign: "right" }) && "bg-mv-cream text-mv-green-dark")}
          >
            <AlignRight size={13} />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-7 w-7 p-0 text-mv-ink-soft hover:text-mv-ink disabled:opacity-30"
          >
            <Undo2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-7 w-7 p-0 text-mv-ink-soft hover:text-mv-ink disabled:opacity-30"
          >
            <Redo2 size={13} />
          </Button>
        </div>
      </div>

      {/* ── Barre d'insertion de modèles Restauration ─────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F5] border-b border-mv-border-soft overflow-x-auto text-[11px]">
        <span className="text-mv-ink-faint font-medium flex items-center gap-1 shrink-0">
          <Sparkles size={11} className="text-mv-amber" /> Modèles restaurant :
        </span>
        <button
          onClick={() => loadTemplate("recipe")}
          className="px-2 py-0.5 rounded bg-white hover:bg-mv-cream border border-mv-border-soft text-mv-ink font-medium shrink-0 transition-colors flex items-center gap-1"
        >
          <Utensils size={10} className="text-mv-green" /> Fiche Recette
        </button>
        <button
          onClick={() => loadTemplate("pricing_sim")}
          className="px-2 py-0.5 rounded bg-white hover:bg-mv-cream border border-mv-border-soft text-mv-ink font-medium shrink-0 transition-colors flex items-center gap-1"
        >
          <TrendingUp size={10} className="text-mv-amber" /> Simulation Marge
        </button>
        <button
          onClick={() => loadTemplate("briefing")}
          className="px-2 py-0.5 rounded bg-white hover:bg-mv-cream border border-mv-border-soft text-mv-ink font-medium shrink-0 transition-colors flex items-center gap-1"
        >
          <ClipboardList size={10} className="text-blue-600" /> Briefing Service
        </button>
      </div>

      {/* ── Surface d'Édition TipTap ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-mv-surface cursor-text" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>

      {/* ── Pied de page du Canvas ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-mv-border-soft bg-[#FAF7F0] text-[11px] text-mv-ink-faint">
        <span className="font-mono">
          {editor.storage.characterCount?.words() ?? 0} mots · {editor.storage.characterCount?.characters() ?? 0} caractères
        </span>
        <span className="text-[11px] text-mv-green-dark font-medium flex items-center gap-1">
          <Check size={11} /> Éditeur Canvas TipTap Actif
        </span>
      </div>
    </div>
  );
}
