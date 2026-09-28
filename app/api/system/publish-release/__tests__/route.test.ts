import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createChangelogEntryAsSystem: vi.fn(),
  announceChangelogEntry: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/data/changelog", () => ({
  createChangelogEntryAsSystem: mocks.createChangelogEntryAsSystem,
}));
vi.mock("@/lib/data/updates", () => ({ announceChangelogEntry: mocks.announceChangelogEntry }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { POST } from "../route";

describe("POST /api/system/publish-release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RELEASE_WEBHOOK_SECRET = "release-secret-for-tests";
    mocks.createChangelogEntryAsSystem.mockResolvedValue({ id: "entry-1", title: "v2.48.0" });
    mocks.announceChangelogEntry.mockResolvedValue(undefined);
  });

  function request(body: unknown, authorization = "Bearer release-secret-for-tests") {
    return new Request("http://localhost/api/system/publish-release", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("requires an authenticated GitHub release screenshot", async () => {
    const response = await POST(request({ title: "v2.48.0", body: "Release notes" }, "Bearer wrong"));
    expect(response.status).toBe(401);
    expect(mocks.createChangelogEntryAsSystem).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    "https://tracker.example/screenshot.png",
    "http://github.com/minerva-flow/app/releases/download/v2.48.0/screenshot.png",
    "https://github.com/minerva-flow/app/releases/tag/v2.48.0/screenshot.png",
    "https://github.com/minerva-flow/app/releases/download/v2.48.0/screenshot.svg",
    "https://github.com/minerva-flow/app/releases/download/v2.48.0/screenshot.png?token=secret",
  ])("rejects a missing or untrusted screenshot URL: %s", async (imageUrl) => {
    const response = await POST(request({ title: "v2.48.0", body: "Release notes", imageUrl }));
    expect(response.status).toBe(400);
    expect(mocks.createChangelogEntryAsSystem).not.toHaveBeenCalled();
  });

  it("stores the attached GitHub screenshot in the changelog entry", async () => {
    const imageUrl = "https://github.com/minerva-flow/flow/releases/download/v2.48.0/changelog.webp";
    const response = await POST(request({
      title: "v2.48.0 — Précommandes et service traiteur",
      body: "## Nouveautés\n- **Précommandes** et devis traiteur.",
      imageUrl,
    }));

    expect(response.status).toBe(200);
    expect(mocks.createChangelogEntryAsSystem).toHaveBeenCalledWith({
      title: "v2.48.0 — Précommandes et service traiteur",
      description: "Nouveautés\n• **Précommandes** et devis traiteur.",
      category: "fonctionnalite",
      imageUrl,
    });
    expect(mocks.announceChangelogEntry).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/changelog");
  });
});
