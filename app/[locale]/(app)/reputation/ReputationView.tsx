"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import { notifyError } from "@/lib/notify-error";
import { useApp } from "@/lib/app-context";
import { respondToReviewAction, respondToGoogleReviewAction, connectGooglePlaceAction } from "./actions";
import type { PrivateReviewWithCustomer, ItemOrOfferReview, GoogleReviewRow } from "@/lib/data/reputation";
import type { Restaurant } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import { ImageLightboxModal } from "@/components/media/ImageLightboxModal";
import { Star, MessageSquareWarning, MapPin, CheckCircle2, ArrowRight } from "lucide-react";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-mv-green">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "" : "text-mv-border"} />
      ))}
    </div>
  );
}

/**
 * A restaurant "connects" its Google Maps listing here (no login, per the
 * request — just picking the right place, same GooglePlacesSearch already
 * used on /etablissement) so future auto-detected bad reviews (Phase 3)
 * have somewhere to attach to. Only google_place_id is ever written from
 * this page — never the rest of the address patch GooglePlacesSearch also
 * returns.
 */
function GoogleConnectCard({ restaurantId, currentPlaceId }: { restaurantId: string; currentPlaceId: string | null }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(Boolean(currentPlaceId));

  async function handleSelect(patch: { googlePlaceId?: string }) {
    if (!patch.googlePlaceId) return;
    setConnecting(true);
    try {
      const ok = await connectGooglePlaceAction(restaurantId, patch.googlePlaceId);
      if (ok) {
        setConnected(true);
        toast.success("Fiche Google Maps connectée.");
      } else {
        notifyError("La connexion a échoué.");
      }
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader
        eyebrow="Google Maps"
        title="Votre fiche Google Maps"
        description="Aucune connexion de compte requise — recherchez et sélectionnez votre établissement pour activer la détection automatique des nouveaux avis."
      />
      {connected ? (
        <div className="flex items-center gap-2 rounded-lg border border-mv-green/20 bg-mv-green-tint px-3 py-2.5 text-[12.5px] text-mv-green-darker">
          <CheckCircle2 size={15} className="shrink-0" />
          Fiche connectée. Vous pouvez la changer ci-dessous si nécessaire.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2.5 text-[12.5px] text-mv-ink-soft">
          <MapPin size={15} className="shrink-0" />
          Aucune fiche connectée pour l'instant.
        </div>
      )}
      <div className="mt-3">
        <GooglePlacesSearch onSelect={handleSelect} />
      </div>
      {connecting && <p className="mt-2 text-[12px] text-mv-ink-faint">Connexion…</p>}
    </Card>
  );
}

function GoogleRespondCard({ review, onResponded }: { review: GoogleReviewRow; onResponded: (id: string, response: string) => void }) {
  const [response, setResponse] = useState(review.ownerResponse ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!response.trim()) {
      notifyError("La réponse ne peut pas être vide.");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await respondToGoogleReviewAction(review.id, response);
      if (ok) {
        onResponded(review.id, response);
        toast.success("Réponse enregistrée.");
      } else {
        notifyError("L'envoi de la réponse a échoué.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRow rating={review.rating} />
          <span className="text-[12.5px] font-medium text-mv-ink">{review.authorName}</span>
        </div>
        {review.publishedAt && (
          <span className="text-[11.5px] text-mv-ink-faint">
            {new Date(review.publishedAt).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      {review.reviewText && <p className="mb-3 text-[13px] leading-relaxed text-mv-ink-soft">{review.reviewText}</p>}
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Notez votre réponse ou l'action prise (ceci ne publie pas automatiquement sur Google Maps)…"
        className="mb-2 min-h-20"
      />
      <div className="flex items-center justify-end gap-2">
        {review.ownerRespondedAt && (
          <span className="mr-auto text-[11.5px] text-mv-ink-faint">
            Répondu le {new Date(review.ownerRespondedAt).toLocaleDateString("fr-CA")}
          </span>
        )}
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {review.ownerResponse ? "Mettre à jour la réponse" : "Répondre"}
        </Button>
      </div>
    </div>
  );
}

function RespondCard({
  review,
  onResponded,
  onOpenImage,
}: {
  review: PrivateReviewWithCustomer;
  onResponded: (id: string, response: string) => void;
  onOpenImage: (url: string, title?: string) => void;
}) {
  const [response, setResponse] = useState(review.ownerResponse ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!response.trim()) {
      notifyError("La réponse ne peut pas être vide.");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await respondToReviewAction(review.id, response);
      if (ok) {
        onResponded(review.id, response);
        toast.success("Réponse envoyée — visible par le client dans l'application.");
      } else {
        notifyError("L'envoi de la réponse a échoué.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-mv-border bg-mv-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <StarRow rating={review.rating} />
            <span className="text-[12.5px] font-semibold text-mv-ink">{review.customerName}</span>
          </div>
          {review.customerEmail && (
            <span className="text-[11px] text-mv-ink-faint font-mono">{review.customerEmail}</span>
          )}
        </div>
        <span className="text-[11.5px] text-mv-ink-faint shrink-0">
          {new Date(review.createdAt).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" })}
        </span>
      </div>
      {review.comment && <p className="mb-3 text-[13px] leading-relaxed text-mv-ink-soft">{review.comment}</p>}

      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {review.imageUrls.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenImage(url, `Photo de ${review.customerName}`)}
              className="group relative h-14 w-14 overflow-hidden rounded-lg border border-mv-border bg-mv-cream-soft shadow-xs transition-all hover:ring-2 hover:ring-mv-green"
              title="Agrandir la photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Avis ${idx + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Votre réponse (visible par ce client dans l'application)…"
        className="mb-2 min-h-20"
      />
      <div className="flex items-center justify-end gap-2">
        {review.ownerRespondedAt && (
          <span className="mr-auto text-[11.5px] text-mv-ink-faint">
            Répondu le {new Date(review.ownerRespondedAt).toLocaleDateString("fr-CA")}
          </span>
        )}
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {review.ownerResponse ? "Mettre à jour la réponse" : "Répondre"}
        </Button>
      </div>
    </div>
  );
}

export function ReputationView({
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
  const { role } = useApp();
  const [reviews, setReviews] = useState(privateReviews);
  const [gReviews, setGReviews] = useState(googleReviews);
  const [visibleCount, setVisibleCount] = useState(6);
  const [lightbox, setLightbox] = useState<{ url: string; title?: string } | null>(null);
  const canRespond = role === "owner" || role === "manager" || role === "staff";

  function handleResponded(id: string, response: string) {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ownerResponse: response, ownerRespondedAt: new Date().toISOString() } : r)));
  }

  function handleGoogleResponded(id: string, response: string) {
    setGReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ownerResponse: response, ownerRespondedAt: new Date().toISOString() } : r)));
  }

  if (!restaurantId || !restaurant) {
    return (
      <div>
        <PageHeader eyebrow="Réputation" title="Réputation" />
        <EmptyState icon={MessageSquareWarning} title="Aucun restaurant" description="Créez ou sélectionnez un établissement pour gérer sa réputation." />
      </div>
    );
  }

  const unanswered = reviews.filter((r) => !r.ownerResponse);
  const answered = reviews.filter((r) => r.ownerResponse);
  const googleUnanswered = gReviews.filter((r) => !r.ownerResponse);
  const googleAnswered = gReviews.filter((r) => r.ownerResponse);

  const allPrivateList = [...unanswered, ...answered];
  const paginatedPrivateList = allPrivateList.slice(0, visibleCount);

  return (
    <div>
      <PageHeader
        eyebrow="Réputation"
        title="Réputation"
        description="Avis en dessous de 4★ restent privés ici — jamais publics — pour que vous puissiez répondre directement au client avant qu'il n'ait à passer par Google Maps."
        action={
          <Link
            href="/reputation/reviews"
            className="inline-flex items-center gap-1.5 rounded-lg border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink hover:bg-mv-cream-soft transition-colors shadow-xs shrink-0"
          >
            <span>Toutes les revues (Vue dense)</span>
            <ArrowRight size={13} />
          </Link>
        }
      />

      <GoogleConnectCard restaurantId={restaurantId} currentPlaceId={restaurant.googlePlaceId} />

      {restaurant.googlePlaceId && (
        <div className="mb-4">
          <Card>
            <CardHeader
              eyebrow="Google Maps"
              title="Avis Google Maps"
              description={
                gReviews.length > 0
                  ? `${gReviews.length} avis synchronisé${gReviews.length > 1 ? "s" : ""} (les 5 plus récents, limite de l'API Google).`
                  : "Aucun avis synchronisé pour l'instant — la synchronisation se fait une fois par jour."
              }
            />
            {gReviews.length === 0 ? (
              <EmptyState icon={MapPin} title="Rien à afficher pour l'instant" description="Revenez après la prochaine synchronisation quotidienne." />
            ) : (
              <div className="space-y-3">
                {[...googleUnanswered, ...googleAnswered].map((review) =>
                  canRespond ? (
                    <GoogleRespondCard key={review.id} review={review} onResponded={handleGoogleResponded} />
                  ) : (
                    <div key={review.id} className="rounded-xl border border-mv-border bg-mv-surface p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <StarRow rating={review.rating} />
                        <span className="text-[12.5px] font-medium text-mv-ink">{review.authorName}</span>
                      </div>
                      {review.reviewText && <p className="text-[13px] text-mv-ink-soft">{review.reviewText}</p>}
                    </div>
                  )
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="mb-4">
        <Card>
          <CardHeader
            eyebrow="À traiter"
            title="Avis à traiter"
            description={unanswered.length > 0 ? `${unanswered.length} avis en attente de réponse.` : "Rien en attente — tout est répondu."}
          />
          {reviews.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Aucun avis privé" description="Les avis en dessous de 4★ apparaîtront ici automatiquement." />
          ) : (
            <div className="space-y-3">
              {paginatedPrivateList.map((review) =>
                canRespond ? (
                  <RespondCard
                    key={review.id}
                    review={review}
                    onResponded={handleResponded}
                    onOpenImage={(url, title) => setLightbox({ url, title })}
                  />
                ) : (
                  <div key={review.id} className="rounded-xl border border-mv-border bg-mv-surface p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <StarRow rating={review.rating} />
                          <span className="text-[12.5px] font-semibold text-mv-ink">{review.customerName}</span>
                        </div>
                        {review.customerEmail && (
                          <span className="text-[11px] text-mv-ink-faint font-mono">{review.customerEmail}</span>
                        )}
                      </div>
                      <span className="text-[11.5px] text-mv-ink-faint shrink-0">
                        {new Date(review.createdAt).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {review.comment && <p className="text-[13px] text-mv-ink-soft mb-2">{review.comment}</p>}
                    {review.imageUrls && review.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {review.imageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightbox({ url, title: `Photo de ${review.customerName}` })}
                            className="h-12 w-12 overflow-hidden rounded-lg border border-mv-border bg-mv-cream-soft"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Avis ${idx + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}

              {visibleCount < allPrivateList.length && (
                <div className="pt-3 flex justify-center border-t border-mv-border-soft">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + 6)}
                    className="gap-1.5"
                  >
                    <span>Voir les 6 suivants</span>
                    <span className="text-mv-ink-faint text-[11px]">
                      ({allPrivateList.length - visibleCount} restant{allPrivateList.length - visibleCount > 1 ? "s" : ""})
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          eyebrow="Visibilité"
          title="Avis sur les plats et les offres"
          description="Les avis natifs sur vos plats et offres individuels, jusqu'ici visibles uniquement dans l'application cliente."
        />
        {itemReviews.length === 0 ? (
          <EmptyState icon={Star} title="Aucun avis pour l'instant" description="Les avis sur vos plats et offres apparaîtront ici." />
        ) : (
          <div className="space-y-2">
            {itemReviews.map((review) => (
              <div key={`${review.kind}-${review.id}`} className="flex items-start gap-3 rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3 py-2.5">
                <StarRow rating={review.rating} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-mv-ink truncate">{review.name}</span>
                    <Badge tone="neutral" className="shrink-0">{review.kind === "menu_item" ? "Plat" : "Offre"}</Badge>
                  </div>
                  {review.comment && <p className="text-[12px] text-mv-ink-soft mt-0.5">{review.comment}</p>}
                  {review.imageUrls && review.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {review.imageUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightbox({ url, title: `Photo pour ${review.name}` })}
                          className="h-10 w-10 overflow-hidden rounded-md border border-mv-border bg-white shadow-2xs hover:opacity-90 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
