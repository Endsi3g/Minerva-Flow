import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isPlatformAdmin: vi.fn(),
  createChangelogEntry: vi.fn(),
  announceChangelogEntry: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/admin", () => ({ isPlatformAdmin: mocks.isPlatformAdmin }));
vi.mock("@/lib/data/changelog", () => ({ createChangelogEntry: mocks.createChangelogEntry }));
vi.mock("@/lib/data/updates", () => ({ announceChangelogEntry: mocks.announceChangelogEntry }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { publishChangelogEntryAction } from "../actions";

describe("publishChangelogEntryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    mocks.isPlatformAdmin.mockResolvedValue(true);
    mocks.createChangelogEntry.mockResolvedValue({ id: "entry-1", title: "Release" });
    mocks.announceChangelogEntry.mockResolvedValue(undefined);
  });

  const baseInput = {
    title: "Release",
    description: "Release notes",
    category: "fonctionnalite" as const,
  };

  it("rejects a missing screenshot before publishing or notifying", async () => {
    expect(await publishChangelogEntryAction(baseInput)).toBe(false);
    expect(mocks.createChangelogEntry).not.toHaveBeenCalled();
    expect(mocks.announceChangelogEntry).not.toHaveBeenCalled();
  });

  it("rejects a screenshot that is not in the public changelog-images bucket", async () => {
    const ok = await publishChangelogEntryAction({ ...baseInput, imageUrl: "https://attacker.test/screenshot.png" });
    expect(ok).toBe(false);
    expect(mocks.createChangelogEntry).not.toHaveBeenCalled();
  });

  it("publishes and announces a screenshot uploaded to the configured changelog bucket", async () => {
    const imageUrl = "https://supabase.test/storage/v1/object/public/changelog-images/changelog/attempt/screen.png";
    const ok = await publishChangelogEntryAction({ ...baseInput, imageUrl });

    expect(ok).toBe(true);
    expect(mocks.createChangelogEntry).toHaveBeenCalledWith({ ...baseInput, imageUrl });
    expect(mocks.announceChangelogEntry).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/changelog");
  });
});
