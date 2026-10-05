import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyAllUsers: vi.fn(async () => undefined),
  sendChangelogCampaignEmail: vi.fn(async () => ({ ok: true })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/notifications", () => ({ notifyAllUsers: mocks.notifyAllUsers }));
vi.mock("@/lib/email/resend", () => ({ sendChangelogCampaignEmail: mocks.sendChangelogCampaignEmail }));

import { announceChangelogEntry } from "@/lib/data/updates";
import type { ChangelogEntry } from "@/lib/data/changelog";

const entry = (audience: ChangelogEntry["audience"]): ChangelogEntry => ({
  id: "1",
  audience,
  title: "Titre",
  description: "Texte",
  category: "fonctionnalite",
  publishedAt: "2026-10-03T00:00:00.000Z",
});

describe("announceChangelogEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never pushes or emails restaurants for a client-only entry", async () => {
    await announceChangelogEntry(entry("client"));
    expect(mocks.notifyAllUsers).not.toHaveBeenCalled();
    expect(mocks.sendChangelogCampaignEmail).not.toHaveBeenCalled();
  });

  it.each(["owner", "all"] as const)("announces a %s entry to restaurants", async (audience) => {
    await announceChangelogEntry(entry(audience));
    expect(mocks.notifyAllUsers).toHaveBeenCalledTimes(1);
    expect(mocks.sendChangelogCampaignEmail).toHaveBeenCalledTimes(1);
  });
});
