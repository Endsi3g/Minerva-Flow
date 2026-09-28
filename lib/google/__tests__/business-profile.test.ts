import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
  listGoogleBusinessReviews,
  replyToGoogleBusinessReview,
  updateGoogleBusinessHours,
} from "@/lib/google/business-profile";

afterEach(() => vi.unstubAllGlobals());

describe("Google Business Profile API wrapper", () => {
  it("uses Google's maximum account page size with no-store caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accounts: [{ name: "accounts/123" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleBusinessAccounts("owner-access-token")).resolves.toEqual([{ name: "accounts/123" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining("mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20") }),
      expect.objectContaining({ cache: "no-store", headers: expect.objectContaining({ Authorization: "Bearer owner-access-token" }) }),
    );
  });

  it("collects all account pages and sends the opaque continuation token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [{ name: "accounts/1" }], nextPageToken: "cursor +/ café" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [{ name: "accounts/2" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleBusinessAccounts("token")).resolves.toEqual([{ name: "accounts/1" }, { name: "accounts/2" }]);
    expect(new URL(fetchMock.mock.calls[1]?.[0] as URL).searchParams.get("pageToken")).toBe("cursor +/ café");
  });

  it("collects locations across every Google location page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ locations: [{ name: "locations/1", title: "Café 1" }], nextPageToken: "next-locations" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ locations: [{ name: "locations/2", title: "Café 2" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleBusinessLocations("token", "accounts/1")).resolves.toEqual([
      { name: "locations/1", title: "Café 1" },
      { name: "locations/2", title: "Café 2" },
    ]);
    expect(new URL(fetchMock.mock.calls[1]?.[0] as URL).searchParams.get("pageToken")).toBe("next-locations");
  });

  it("stops if Google repeats a continuation token", async () => {
    const repeatedPage = () => new Response(JSON.stringify({ accounts: [], nextPageToken: "repeat" }), { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(repeatedPage()).mockResolvedValueOnce(repeatedPage());
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleBusinessAccounts("token")).rejects.toMatchObject({ status: 502, message: expect.stringContaining("curseur de pagination répétitif") });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed resource names before making an API request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleBusinessLocations("token", "accounts/forged/other")).rejects.toMatchObject({ status: 400 });
    await expect(replyToGoogleBusinessReview("token", "accounts/1/locations/2/reviews/../other", "Thanks")).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns clear authorization guidance when Google denies access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED" } }), { status: 403 })));

    await expect(listGoogleBusinessAccounts("token")).rejects.toMatchObject({
      name: "GoogleBusinessProfileError",
      status: 403,
      message: expect.stringContaining("Vérifiez l’approbation API"),
    });
  });

  it("requests the next review page with the opaque Google page token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ reviews: [], nextPageToken: "cursor +/ café", totalReviewCount: 72 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleBusinessReviews("token", "accounts/1", "locations/2", "cursor +/ café")).resolves.toMatchObject({
      reviews: [],
      nextPageToken: "cursor +/ café",
      totalReviewCount: 72,
    });

    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(requestUrl.searchParams.get("pageToken")).toBe("cursor +/ café");
  });

  it("sends an explicit hours update and review reply to Google", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "locations/2", regularHours: { periods: [] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ comment: "Merci!" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateGoogleBusinessHours("token", "locations/2", [{ openDay: "MONDAY", openTime: "09:00", closeDay: "MONDAY", closeTime: "17:00" }]);
    await replyToGoogleBusinessReview("token", "accounts/1/locations/2/reviews/3", "Merci!");

    expect(fetchMock.mock.calls[0]?.[0]).toMatchObject({ href: expect.stringContaining("updateMask=regularHours") });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH", body: expect.stringContaining('"openTime":"09:00"') });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT", body: JSON.stringify({ comment: "Merci!" }) });
  });
});
