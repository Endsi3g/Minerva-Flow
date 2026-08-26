"use client";

import type { LibraryAsset } from "@/lib/data/library";
import { createLibraryAssetAction, deleteLibraryAssetAction, getLibraryAssetDownloadUrlAction } from "@/app/[locale]/(app)/library/actions";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { Card } from "@/components/minerva/PageCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Download,
  Trash2,
  X,
  Sparkles,
  ArrowUpRight,
  Filter,
  FolderOpen,
  Compass,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

const BUCKET = "library-assets";
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const CATEGORY_LABELS: Record<LibraryAsset["category"] | "all", string> = {
  all: "Tous",
  facture: "Factures & fournisseurs",
  rapport: "Rapports de revenus",
  menu: "Menu & cartes",
  procedure: "Procédures",
  autre: "Vos fichiers",
};

function getFileIcon(fileType: LibraryAsset["fileType"]) {
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
}

function AssetRow({
  asset,
  isSelected,
  onSelect,
}: {
  asset: LibraryAsset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all cursor-pointer ${
        isSelected
          ? "border-mv-green bg-mv-surface shadow-mv-md ring-2 ring-mv-green/30"
          : "border-mv-border bg-mv-surface hover:border-mv-green-dark hover:shadow-mv-sm"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-mv-border-soft bg-mv-cream-soft">
          {getFileIcon(asset.fileType)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-bold text-mv-ink transition-colors group-hover:text-mv-green-dark">
            {asset.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-mv-ink-soft">
            <span className="truncate">{asset.sourceName}</span>
            <span>•</span>
            <span className="shrink-0">{asset.sizeFormatted}</span>
            <span>•</span>
            <span className="shrink-0">{asset.updatedAt}</span>
          </div>
        </div>
      </div>
      {asset.url && <ArrowUpRight size={16} className="shrink-0 text-mv-ink-faint group-hover:text-mv-green-dark" />}
    </div>
  );
}

export function LibraryView({
  initialAssets,
  restaurantId,
  restaurantName,
}: {
  initialAssets: LibraryAsset[];
  restaurantId: string;
  restaurantName: string;
}) {
  const router = useRouter();
  const [assets, setAssets] = useState<LibraryAsset[]>(initialAssets);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [sessionId] = useState(() => crypto.randomUUID());
  const uploadPath = `${restaurantId}/${sessionId}`;
  const upload = useSupabaseUpload({
    bucketName: BUCKET,
    path: uploadPath,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFiles: 10,
    maxFileSize: 20 * 1024 * 1024,
  });
  const registeredRef = useRef<Set<string>>(new Set());

  // Auto-upload as soon as valid files are dropped/picked, same as chat/campaign uploads.
  useEffect(() => {
    const pending = upload.files.filter((f) => f.errors.length === 0 && !upload.successes.includes(f.name));
    if (pending.length > 0 && !upload.loading) upload.onUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.files]);

  // Once a file lands in storage, register it as a real, persisted row —
  // without this it would sit in the bucket invisibly.
  useEffect(() => {
    const newlyUploaded = upload.files.filter(
      (f) => upload.successes.includes(f.name) && !registeredRef.current.has(f.name)
    );
    if (newlyUploaded.length === 0) return;

    (async () => {
      for (const file of newlyUploaded) {
        registeredRef.current.add(file.name);
        const created = await createLibraryAssetAction(restaurantId, {
          storagePath: `${uploadPath}/${file.name}`,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        if (created) {
          setAssets((prev) => [created, ...prev]);
          toast.success(`"${file.name}" ajouté à la bibliothèque.`);
        } else {
          toast.error(`"${file.name}" a été téléversé mais n'a pas pu être enregistré.`);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.successes]);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const yourFiles = filteredAssets.filter((a) => a.storagePath);
  const shortcuts = filteredAssets.filter((a) => a.url);
  const totalBytesUploaded = assets
    .filter((a) => a.storagePath)
    .reduce((sum, a) => sum + (parseSizeToBytes(a.sizeFormatted) ?? 0), 0);

  function openAsset(asset: LibraryAsset) {
    if (asset.url) {
      router.push(asset.url);
      return;
    }
    setSelectedAsset(asset);
  }

  async function handleDownload(asset: LibraryAsset) {
    setIsDownloading(true);
    const url = await getLibraryAssetDownloadUrlAction(restaurantId, asset.id);
    setIsDownloading(false);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Le téléchargement a échoué — le fichier est peut-être introuvable.");
    }
  }

  async function handleDelete(asset: LibraryAsset) {
    if (!window.confirm(`Supprimer "${asset.title}" de la bibliothèque ? Cette action est irréversible.`)) return;
    setIsDeleting(true);
    const ok = await deleteLibraryAssetAction(restaurantId, asset.id);
    setIsDeleting(false);
    if (ok) {
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setSelectedAsset(null);
      toast.success(`"${asset.title}" supprimé.`);
    } else {
      toast.error("La suppression a échoué.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={restaurantName}
        title="Documents"
        description="Vos fichiers, en un seul endroit — et des raccourcis rapides vers vos factures, votre menu et vos rapports ailleurs dans Flow."
      />

      {assets.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 shadow-mv-sm">
            <FolderOpen size={15} className="text-mv-green-dark" />
            <span className="text-[13px] text-mv-ink-soft">
              <strong className="font-semibold text-mv-ink">{yourFiles.length}</strong> fichier
              {yourFiles.length !== 1 ? "s" : ""} téléversé{yourFiles.length !== 1 ? "s" : ""}
              {totalBytesUploaded > 0 && <> · {formatBytesHuman(totalBytesUploaded)}</>}
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 shadow-mv-sm">
            <Compass size={15} className="text-mv-green-dark" />
            <span className="text-[13px] text-mv-ink-soft">
              <strong className="font-semibold text-mv-ink">{shortcuts.length}</strong> raccourci
              {shortcuts.length !== 1 ? "s" : ""} vers vos données
            </span>
          </div>
        </div>
      )}

      {/* Upload */}
      <div className="mb-6">
        <Dropzone {...upload}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      </div>

      {/* Search + filters */}
      <div className="space-y-4">
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12px] font-semibold text-mv-ink">
            <Filter size={13} className="text-mv-green-dark" />
            <span>Filtres :</span>
          </div>
          {(["all", "autre", "facture", "rapport", "menu"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                  : "border border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-6">
          {filteredAssets.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Aucun document ne correspond à votre recherche"
              description="Essayez de modifier vos filtres, ou glissez un fichier ci-dessus pour l'ajouter."
            />
          ) : (
            <>
              {yourFiles.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                    Vos fichiers
                  </p>
                  {yourFiles.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAsset?.id === asset.id}
                      onSelect={() => openAsset(asset)}
                    />
                  ))}
                </div>
              )}

              {shortcuts.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                    Raccourcis vers vos données
                  </p>
                  {shortcuts.map((asset) => (
                    <AssetRow key={asset.id} asset={asset} isSelected={false} onSelect={() => openAsset(asset)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right preview drawer — real uploads only; shortcuts navigate directly */}
        {selectedAsset && (
          <div className="w-full lg:w-[400px] shrink-0">
            <Card padded={false} className="sticky top-6 overflow-hidden border-mv-border bg-mv-surface shadow-mv-md">
              <div className="flex items-center justify-between border-b border-mv-border bg-mv-cream-soft p-4">
                <div className="flex items-center gap-2 truncate">
                  {getFileIcon(selectedAsset.fileType)}
                  <span className="truncate text-[13.5px] font-bold text-mv-ink">{selectedAsset.title}</span>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="rounded-lg p-1 text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="space-y-3 rounded-xl border border-mv-border-soft bg-mv-cream-soft p-4">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Source :</span>
                    <span className="font-semibold text-mv-ink">{selectedAsset.sourceName}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Taille :</span>
                    <span className="font-semibold text-mv-ink">{selectedAsset.sizeFormatted}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-mv-ink-soft">Ajouté le :</span>
                    <span className="font-semibold text-mv-ink">{selectedAsset.updatedAt}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">Description</h4>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mv-ink-soft">
                    {selectedAsset.description || "Aucune description supplémentaire."}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href="/assistant"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-4 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark"
                  >
                    <Sparkles size={16} />
                    <span>Discuter avec l&apos;IA au sujet de ce fichier</span>
                  </Link>

                  <button
                    onClick={() => handleDownload(selectedAsset)}
                    disabled={isDownloading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-4 py-2.5 text-[13px] font-semibold text-mv-ink transition-all hover:bg-mv-cream-soft disabled:opacity-60"
                  >
                    <Download size={15} />
                    <span>{isDownloading ? "Préparation…" : "Télécharger le fichier"}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedAsset)}
                    disabled={isDeleting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-mv-red/30 bg-mv-red-bg px-4 py-2.5 text-[13px] font-semibold text-mv-red transition-all hover:bg-mv-red/10 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    <span>{isDeleting ? "Suppression…" : "Supprimer"}</span>
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

function formatBytesHuman(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseSizeToBytes(sizeFormatted: string): number | null {
  const match = /^([\d.]+)\s*(o|KB|MB)$/.exec(sizeFormatted);
  if (!match) return null;
  const value = Number(match[1]);
  if (match[2] === "MB") return value * 1024 * 1024;
  if (match[2] === "KB") return value * 1024;
  return value;
}
