"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageLightboxModal } from "@/components/media/ImageLightboxModal";
import { Link } from "@/i18n/navigation";
import type { PrivateReviewWithCustomer, ItemOrOfferReview, GoogleReviewRow } from "@/lib/data/reputation";
import type { Restaurant } from "@/lib/types";
import {
  Star,
  Search,
  ArrowLeft,
  MessageSquare,
  MapPin,
  UtensilsCrossed,
  Tag,
  CheckCircle2,
  Clock,
  ImageIcon,
} from "lucide-react";

type UnifiedReview = {
  id: string;
  source: "private" | "google" | "menu_item" | "offer";
  rating: number;
  authorName: string;
  authorEmail?: string | null;
  targetName?: string;
  comment: string | null;
  createdAt: string;
  imageUrls: string[];
  ownerResponse?: string | null;
  ownerRespondedAt?: string | null;
};

function StarMini({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-mv-green">
      <Star size={12} fill="currentColor" />
      <span className="font-mono text-[12px] font-bold">{rating}</span>
    </div>
  );
}

export function AllReviewsView({
  restaurantId,
  restaurant,
  privateReviews,
  itemReviews,
  googleReviews,
}: {
  restaurantId: string | null;
  restaurant: Restaurant | null;
  privateReviews: PrivateReviewWithCustomer[];
  itemReviews: ItemOrOfferReview[];
  googleReviews: GoogleReviewRow[];
}) {
  const [filterType, setFilterType] = useState<"all" | "private" | "google" | "menu_item" | "offer">("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; title?: string } | null>(null);

  // Normalize all reviews into a single list
  const unifiedReviews: UnifiedReview[] = useMemo(() => {
    const list: UnifiedReview[] = [];

    for (const r of privateReviews) {
      list.push({
        id: `priv-${r.id}`,
        source: "private",
        rating: r.rating,
        authorName: r.customerName,
        authorEmail: r.customerEmail,
        comment: r.comment,
        createdAt: r.createdAt,
        imageUrls: r.imageUrls ?? [],
        ownerResponse: r.ownerResponse,
        ownerRespondedAt: r.ownerRespondedAt,
      });
    }

    for (const g of googleReviews) {
      list.push({
        id: `goog-${g.id}`,
        source: "google",
        rating: g.rating,
        authorName: g.authorName,
        comment: g.reviewText,
        createdAt: g.publishedAt ?? new Date().toISOString(),
        imageUrls: [],
        ownerResponse: g.ownerResponse,
        ownerRespondedAt: g.ownerRespondedAt,
      });
    }

    for (const item of itemReviews) {
      list.push({
        id: `item-${item.kind}-${item.id}`,
        source: item.kind,
        rating: item.rating,
        authorName: "Client vérifié",
        targetName: item.name,
        comment: item.comment,
        createdAt: item.createdAt,
        imageUrls: item.imageUrls ?? [],
      });
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [privateReviews, googleReviews, itemReviews]);

  const filtered = useMemo(() => {
    return unifiedReviews.filter((r) => {
      if (filterType !== "all" && r.source !== filterType) return false;
      if (ratingFilter !== "all" && r.rating !== ratingFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesComment = r.comment?.toLowerCase().includes(q) ?? false;
        const matchesAuthor = r.authorName.toLowerCase().includes(q);
        const matchesEmail = r.authorEmail?.toLowerCase().includes(q) ?? false;
        const matchesTarget = r.targetName?.toLowerCase().includes(q) ?? false;
        if (!matchesComment && !matchesAuthor && !matchesEmail && !matchesTarget) return false;
      }
      return true;
    });
  }, [unifiedReviews, filterType, ratingFilter, searchQuery]);

  if (!restaurantId || !restaurant) {
    return (
      <div className="p-6">
        <PageHeader eyebrow="Réputation" title="Toutes les revues" />
        <EmptyState icon={MessageSquare} title="Aucun restaurant sélectionné" description="Sélectionnez un établissement pour voir ses revues." />
      </div>
    );
  }

  const counts = {
    all: unifiedReviews.length,
    private: privateReviews.length,
    google: googleReviews.length,
    menu_item: itemReviews.filter((i) => i.kind === "menu_item").length,
    offer: itemReviews.filter((i) => i.kind === "offer").length,
  };

  return (
    <div className="space-y-4">
      {/* Header with back link */}
      <div>
        <div className="mb-2">
          <Link
            href="/reputation"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-mv-ink-soft hover:text-mv-green transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Retour à la gestion de Réputation</span>
          </Link>
        </div>
        <PageHeader
          eyebrow="Réputation · Vue haute densité"
          title={`Toutes les revues (${unifiedReviews.length})`}
          description="Registre exhaustif condensé de tous les avis enregistrés : avis privés restaurant, fiches Google Maps, plats et offres promotionnelles."
        />
      </div>

      {/* Control bar: Filters & Search */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                filterType === "all" ? "bg-mv-green text-white shadow-2xs" : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Toutes ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("private")}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                filterType === "private" ? "bg-mv-green text-white shadow-2xs" : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Avis privés (<span className="text-[11px]">4★</span>) ({counts.private})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("google")}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                filterType === "google" ? "bg-mv-green text-white shadow-2xs" : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Google Maps ({counts.google})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("menu_item")}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                filterType === "menu_item" ? "bg-mv-green text-white shadow-2xs" : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Plats ({counts.menu_item})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("offer")}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                filterType === "offer" ? "bg-mv-green text-white shadow-2xs" : "bg-mv-cream-soft text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              Offres ({counts.offer})
            </button>
          </div>

          {/* Rating filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11.5px] text-mv-ink-faint mr-1">Note :</span>
            {(["all", 5, 4, 3, 2, 1] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRatingFilter(r)}
                className={`flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  ratingFilter === r ? "bg-mv-ink text-white" : "border border-mv-border text-mv-ink-soft hover:bg-mv-cream-soft"
                }`}
              >
                {r === "all" ? "Toutes" : `${r}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <input
            type="text"
            placeholder="Rechercher par auteur, email, plat ou contenu du commentaire…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-mv-border bg-white pl-8 pr-3 py-1.5 text-[12.5px] text-mv-ink placeholder:text-mv-ink-faint focus:border-mv-green focus:outline-none"
          />
        </div>
      </Card>

      {/* Dense Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-mv-border bg-mv-cream-soft/70 text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Note</th>
                <th className="py-2.5 px-3">Auteur &amp; Compte</th>
                <th className="py-2.5 px-3">Cible</th>
                <th className="py-2.5 px-3">Photos</th>
                <th className="py-2.5 px-3 w-2/5 min-w-64">Commentaire &amp; Réponse</th>
                <th className="py-2.5 px-3 text-right">Date &amp; Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mv-border-soft">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-mv-ink-faint">
                    Aucun avis ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filtered.map((review) => {
                  const sourceConfig = {
                    private: { label: "Avis Privé", tone: "amber" as const, icon: MessageSquare },
                    google: { label: "Google Maps", tone: "blue" as const, icon: MapPin },
                    menu_item: { label: "Plat", tone: "neutral" as const, icon: UtensilsCrossed },
                    offer: { label: "Offre", tone: "green" as const, icon: Tag },
                  }[review.source];

                  const Icon = sourceConfig.icon;

                  return (
                    <tr key={review.id} className="hover:bg-mv-cream-soft/30 transition-colors">
                      {/* Type Badge */}
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <Badge tone={sourceConfig.tone} className="gap-1 text-[11px] py-0.5">
                          <Icon size={10} />
                          <span>{sourceConfig.label}</span>
                        </Badge>
                      </td>

                      {/* Rating */}
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <StarMini rating={review.rating} />
                      </td>

                      {/* Author & Email */}
                      <td className="py-2.5 px-3 align-top">
                        <p className="font-semibold text-mv-ink">{review.authorName}</p>
                        {review.authorEmail && (
                          <p className="font-mono text-[10.5px] text-mv-ink-faint truncate max-w-44">
                            {review.authorEmail}
                          </p>
                        )}
                      </td>

                      {/* Target (for dishes or offers) */}
                      <td className="py-2.5 px-3 align-top whitespace-nowrap text-mv-ink-soft">
                        {review.targetName ? (
                          <span className="font-medium text-mv-ink">{review.targetName}</span>
                        ) : (
                          <span className="text-mv-ink-faint italic text-[11px]">Établissement</span>
                        )}
                      </td>

                      {/* Photos */}
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        {review.imageUrls && review.imageUrls.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {review.imageUrls.slice(0, 2).map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setLightbox({ url, title: `Photo de ${review.authorName}` })}
                                className="h-8 w-8 overflow-hidden rounded border border-mv-border hover:opacity-80 transition-opacity"
                                title="Voir en grand"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="Aperçu" className="h-full w-full object-cover" />
                              </button>
                            ))}
                            {review.imageUrls.length > 2 && (
                              <span className="text-[10px] text-mv-ink-faint">
                                +{review.imageUrls.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-mv-ink-faint text-[11px]">—</span>
                        )}
                      </td>

                      {/* Comment & Response */}
                      <td className="py-2.5 px-3 align-top">
                        {review.comment ? (
                          <p className="text-mv-ink leading-relaxed">{review.comment}</p>
                        ) : (
                          <span className="text-mv-ink-faint italic text-[11px]">Sans commentaire</span>
                        )}
                        {review.ownerResponse && (
                          <div className="mt-1.5 rounded-md border border-mv-green/20 bg-mv-green-tint/50 p-2 text-[11.5px] text-mv-green-darker">
                            <span className="font-semibold block mb-0.5">Votre réponse :</span>
                            <span>{review.ownerResponse}</span>
                          </div>
                        )}
                      </td>

                      {/* Date & Status */}
                      <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                        <p className="text-[11.5px] text-mv-ink-faint font-mono">
                          {new Date(review.createdAt).toLocaleDateString("fr-CA")}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          {review.ownerResponse ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-mv-green">
                              <CheckCircle2 size={11} />
                              Répondu
                            </span>
                          ) : review.source === "private" || review.source === "google" ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-mv-amber">
                              <Clock size={11} />
                              À traiter
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ImageLightboxModal
        imageUrl={lightbox?.url}
        title={lightbox?.title}
        isOpen={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
