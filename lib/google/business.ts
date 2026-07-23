import "server-only";

import { getGoogleTokens, getGoogleConnection } from "@/lib/data/google-connections";
import { isGooglePlacesConfigured } from "@/lib/google/config";

export type GoogleBusinessReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  relativeTime: string;
  replyText?: string;
};

export type GoogleBusinessHours = {
  openNow: boolean;
  periods?: Array<{ openDay: string; openTime: string; closeDay: string; closeTime: string }>;
};

/**
 * Fetches Google Business Profile reviews via Google Places API / Business API.
 */
export async function getGoogleBusinessReviews(restaurantId: string): Promise<GoogleBusinessReview[]> {
  const connection = await getGoogleConnection(restaurantId);
  const placeId = connection?.ga4PropertyId || process.env.GOOGLE_PLACES_DEFAULT_PLACE_ID;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey || !placeId) {
    return [
      {
        id: "rev-sample-1",
        authorName: "Sophie Tremblay",
        rating: 5,
        comment: "Excellent service et nourriture délicieuse ! Le brunch du dimanche est incontournable.",
        relativeTime: "Il y a 2 jours",
      },
      {
        id: "rev-sample-2",
        authorName: "Marc-André Roy",
        rating: 4,
        comment: "Très belle ambiance et sélection de vins impeccable. Légère attente au service.",
        relativeTime: "Il y a 1 semaine",
      },
    ];
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}&language=fr`
    );

    if (!res.ok) return [];
    const data = await res.json();
    const reviews = data.result?.reviews || [];

    return reviews.map((r: any, index: number) => ({
      id: `rev-${index}-${r.time}`,
      authorName: r.author_name || "Client Google",
      rating: r.rating || 5,
      comment: r.text || "",
      relativeTime: r.relative_time_description || "Récemment",
    }));
  } catch (err) {
    console.error("[Google Business Reviews Error]", err);
    return [];
  }
}
