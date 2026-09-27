type GoogleErrorShape = { error?: { message?: string; status?: string } };

export class GoogleBusinessProfileError extends Error {
  readonly status: number;
  readonly googleStatus?: string;

  constructor(status: number, message: string, googleStatus?: string) {
    super(message);
    this.name = "GoogleBusinessProfileError";
    this.status = status;
    this.googleStatus = googleStatus;
  }
}

async function googleJson<T>(url: URL, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as T & GoogleErrorShape;
  if (!response.ok) {
    const googleError = (payload as GoogleErrorShape).error;
    const message = response.status === 403
      ? "Google refuse l’accès à cette fiche. Vérifiez l’approbation API et les droits de gestion de ce compte."
      : response.status === 404
        ? "Cette fiche Google Business Profile est introuvable ou n’est plus accessible."
        : response.status === 401
          ? "L’autorisation Google a expiré. Reconnectez votre compte Google."
          : "Google Business Profile n’a pas pu traiter la demande. Réessayez dans un instant.";
    throw new GoogleBusinessProfileError(response.status, message, googleError?.status);
  }
  return payload;
}

export type GoogleBusinessAccount = { name: string; accountName?: string; type?: string };
export type GoogleBusinessLocation = {
  name: string;
  title: string;
  storeCode?: string;
  regularHours?: { periods?: GoogleBusinessHourPeriod[] };
  metadata?: { placeId?: string };
  websiteUri?: string;
};
export type GoogleBusinessHourPeriod = {
  openDay: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  openTime: string;
  closeDay: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  closeTime: string;
};
export type GoogleBusinessReview = {
  name: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
};

function googleUrl(base: string, path: string, query?: Record<string, string>) {
  const url = new URL(path.replace(/^\//, ""), base);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  return url;
}

const MAX_GOOGLE_LIST_PAGES = 100;

async function collectGooglePages<T extends { name: string }>(
  fetchPage: (pageToken?: string) => Promise<{ items: T[]; nextPageToken?: string }>,
  resourceLabel: string,
): Promise<T[]> {
  const items = new Map<string, T>();
  const seenPageTokens = new Set<string>();
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_GOOGLE_LIST_PAGES; page += 1) {
    const result = await fetchPage(pageToken);
    for (const item of result.items) items.set(item.name, item);

    const nextPageToken = result.nextPageToken;
    if (!nextPageToken) return [...items.values()];
    if (seenPageTokens.has(nextPageToken)) {
      throw new GoogleBusinessProfileError(502, `Google a renvoyé un curseur de pagination répétitif pour ${resourceLabel}.`);
    }
    seenPageTokens.add(nextPageToken);
    pageToken = nextPageToken;
  }

  throw new GoogleBusinessProfileError(502, `La liste Google dépasse la limite de pages prise en charge pour ${resourceLabel}.`);
}

export async function listGoogleBusinessAccounts(accessToken: string): Promise<GoogleBusinessAccount[]> {
  return collectGooglePages(async (pageToken) => {
    const data = await googleJson<{ accounts?: GoogleBusinessAccount[]; nextPageToken?: string }>(
      googleUrl("https://mybusinessaccountmanagement.googleapis.com/v1/", "accounts", {
        pageSize: "20",
        ...(pageToken ? { pageToken } : {}),
      }),
      accessToken,
    );
    return { items: data.accounts ?? [], nextPageToken: data.nextPageToken };
  }, "les comptes");
}

export async function listGoogleBusinessLocations(accessToken: string, accountName: string): Promise<GoogleBusinessLocation[]> {
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(accountName)) throw new GoogleBusinessProfileError(400, "Compte Google invalide.");
  return collectGooglePages(async (pageToken) => {
    const data = await googleJson<{ locations?: GoogleBusinessLocation[]; nextPageToken?: string }>(
      googleUrl("https://mybusinessbusinessinformation.googleapis.com/v1/", `${accountName}/locations`, {
        pageSize: "100",
        readMask: "name,title,storeCode,regularHours,metadata,websiteUri",
        ...(pageToken ? { pageToken } : {}),
      }),
      accessToken,
    );
    return { items: data.locations ?? [], nextPageToken: data.nextPageToken };
  }, "les fiches");
}

export async function listGoogleBusinessReviews(
  accessToken: string,
  accountName: string,
  locationName: string,
  pageToken?: string,
): Promise<{ reviews: GoogleBusinessReview[]; nextPageToken?: string; totalReviewCount?: number }> {
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(accountName) || !/^locations\/[A-Za-z0-9_-]+$/.test(locationName)) {
    throw new GoogleBusinessProfileError(400, "Fiche Google invalide.");
  }
  const data = await googleJson<{ reviews?: GoogleBusinessReview[]; nextPageToken?: string; totalReviewCount?: number }>(
    googleUrl("https://mybusiness.googleapis.com/v4/", `${accountName}/${locationName}/reviews`, {
      pageSize: "50",
      ...(pageToken ? { pageToken } : {}),
    }),
    accessToken,
  );
  return { reviews: data.reviews ?? [], nextPageToken: data.nextPageToken, totalReviewCount: data.totalReviewCount };
}

export async function updateGoogleBusinessHours(
  accessToken: string,
  locationName: string,
  periods: GoogleBusinessHourPeriod[],
): Promise<GoogleBusinessLocation> {
  if (!/^locations\/[A-Za-z0-9_-]+$/.test(locationName)) throw new GoogleBusinessProfileError(400, "Fiche Google invalide.");
  const url = googleUrl("https://mybusinessbusinessinformation.googleapis.com/v1/", locationName, { updateMask: "regularHours" });
  return googleJson<GoogleBusinessLocation>(url, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ regularHours: { periods } }),
  });
}

export async function replyToGoogleBusinessReview(accessToken: string, reviewName: string, comment: string) {
  if (!/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/.test(reviewName)) {
    throw new GoogleBusinessProfileError(400, "Avis Google invalide.");
  }
  const url = googleUrl("https://mybusiness.googleapis.com/v4/", `${reviewName}/reply`);
  return googleJson<{ comment: string; updateTime?: string }>(url, accessToken, {
    method: "PUT",
    body: JSON.stringify({ comment }),
  });
}
