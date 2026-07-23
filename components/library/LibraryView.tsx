"use client";

import type { LibraryAsset } from "@/lib/data/library";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Download,
  Share2,
  X,
  Plus,
  Sparkles,
  ExternalLink,
  Calendar,
  Filter,
  Layers,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

export function LibraryView({
  initialAssets,
  restaurantName,
}: {
  initialAssets: LibraryAsset[];
  restaurantName: string;
}) {
  const router = useRouter();
  const [assets, setAssets] = useState<LibraryAsset[]>(initialAssets);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(initialAssets[0] || null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || asset.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (fileType: LibraryAsset["fileType"]) => {
    switch (fileType) {
      case "pdf":
        return <FileText size={18} className="text-mv-red" />;
      case "doc":
        return <FileText size={18} className="text-mv-green-dark" />;
      case "sheet":
        return <FileSpreadsheet size={18} className="text-mv-green" />;
      case "image":
        return <ImageIcon size={18} className="text-mv-amber" />;
      default:
        return <FileCode size={18} className="text-mv-ink-soft" />;
    }
  };

  function handleSimulatedUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);

    setTimeout(() => {
      const file = files[0];
      const newAsset: LibraryAsset = {
        id: `upload-${Date.now()}`,
        title: file.name,
        category: "autre",
        fileType: file.name.endsWith(".pdf") ? "pdf" : "doc",
        sizeFormatted: `${(file.size / 1024).toFixed(0)} KB`,
        updatedAt: "Aujourd'hui",
        sourceName: "Téléversement direct",
        description: "Fichier ajouté à la bibliothèque de l'établissement.",
      };
      setAssets((prev) => [newAsset, ...prev]);
      setSelectedAsset(newAsset);
      setIsUploading(false);
    }, 800);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mv-green-tint px-2.5 py-0.5 text-[11px] font-bold text-mv-green-dark uppercase tracking-wider">
              {restaurantName}
            </span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-mv-ink mt-1">
            Bibliothèque d&apos;assets & Documents
          </h1>
          <p className="text-[13.5px] text-mv-ink-soft">
            Recherchez et utilisez les documents, factures et rapports de votre établissement à travers Flow.
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-2 rounded-xl bg-mv-green px-4 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark cursor-pointer shrink-0">
          <Upload size={16} />
          <span>{isUploading ? "Téléversement..." : "Ajouter un asset"}</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.csv,.xlsx"
            onChange={handleSimulatedUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Main Search Bar & Filter Pills (Sana AI style - Image 5) */}
      <div className="mt-6 space-y-4">
        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-mv-ink-faint" />
          <input
            type="text"
            placeholder="Rechercher un document, une facture, un plat ou un rapport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-mv-border bg-mv-surface py-3.5 pl-11 pr-4 text-[14px] text-mv-ink shadow-mv-sm placeholder-mv-ink-faint transition-all focus:border-mv-green-dark focus:outline-none focus:ring-2 focus:ring-mv-green/20"
          />
        </div>

        {/* Sana AI Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12px] font-semibold text-mv-ink">
            <Filter size={13} className="text-mv-green-dark" />
            <span>Filtres :</span>
          </div>

          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
            }`}
          >
            Tous ({assets.length})
          </button>
          <button
            onClick={() => setSelectedCategory("facture")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              selectedCategory === "facture"
                ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
            }`}
          >
            Factures & Fournisseurs
          </button>
          <button
            onClick={() => setSelectedCategory("rapport")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              selectedCategory === "rapport"
                ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
            }`}
          >
            Rapports de revenus
          </button>
          <button
            onClick={() => setSelectedCategory("menu")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              selectedCategory === "menu"
                ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
            }`}
          >
            Menu & Cartes
          </button>
          <button
            onClick={() => setSelectedCategory("procedure")}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              selectedCategory === "procedure"
                ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
            }`}
          >
            Procédures & MAPAQ
          </button>
        </div>
      </div>

      {/* Split-Screen Main Container */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Assets List */}
        <div className="flex-1 space-y-2.5">
          {filteredAssets.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-[14px] font-medium text-mv-ink">Aucun document ne correspond à votre recherche.</p>
              <p className="mt-1 text-[12.5px] text-mv-ink-soft">Essayez de modifier vos filtres ou de téléverser un nouvel asset.</p>
            </Card>
          ) : (
            filteredAssets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`group flex items-center justify-between rounded-2xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-mv-green bg-mv-surface shadow-mv-md ring-2 ring-mv-green/30"
                      : "border-mv-border bg-mv-surface hover:border-mv-green-dark hover:shadow-mv-sm"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mv-cream-soft border border-mv-border-soft">
                      {getFileIcon(asset.fileType)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-[13.5px] font-bold text-mv-ink group-hover:text-mv-green-dark transition-colors">
                        {asset.title}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-3 text-[12px] text-mv-ink-soft">
                        <span>{asset.sourceName}</span>
                        <span>•</span>
                        <span>{asset.sizeFormatted}</span>
                        <span>•</span>
                        <span>{asset.updatedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/assistant");
                      }}
                      className="hidden sm:flex items-center gap-1 rounded-lg border border-mv-border bg-mv-cream-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-mv-ink hover:bg-mv-green-tint hover:text-mv-green-dark transition-colors"
                      title="Utiliser dans le Chat IA"
                    >
                      <Sparkles size={13} className="text-mv-green-dark" />
                      <span>Analyser</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Split-Pane Preview Drawer (Sana AI style - Image 4) */}
        {selectedAsset && (
          <div className="w-full lg:w-[400px] shrink-0">
            <Card padded={false} className="sticky top-6 border-mv-border bg-mv-surface shadow-mv-md overflow-hidden">
              <div className="flex items-center justify-between border-b border-mv-border p-4 bg-mv-cream-soft">
                <div className="flex items-center gap-2 truncate">
                  {getFileIcon(selectedAsset.fileType)}
                  <span className="font-bold text-[13.5px] text-mv-ink truncate">{selectedAsset.title}</span>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="rounded-lg p-1 text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Document Metadata Details */}
                <div className="space-y-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Catégorie :</span>
                    <span className="font-semibold uppercase tracking-wider text-mv-green-dark text-[11px]">{selectedAsset.category}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Source :</span>
                    <span className="font-semibold text-mv-ink">{selectedAsset.sourceName}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Taille du fichier :</span>
                    <span className="font-semibold text-mv-ink">{selectedAsset.sizeFormatted}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Dernière modif :</span>
                    <span className="font-semibold text-mv-ink">{selectedAsset.updatedAt}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">Description</h4>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mv-ink-soft">
                    {selectedAsset.description || "Aucune description supplémentaire pour cet asset."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Link
                    href="/assistant"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-4 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
                  >
                    <Sparkles size={16} />
                    <span>Discuter avec l&apos;IA au sujet de ce document</span>
                  </Link>

                  <button
                    onClick={() => alert(`Téléchargement de ${selectedAsset.title} en cours...`)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 text-[13px] font-semibold text-mv-ink transition-all hover:bg-mv-cream-soft"
                  >
                    <Download size={15} />
                    <span>Télécharger le fichier</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
