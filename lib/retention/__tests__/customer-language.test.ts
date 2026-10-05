import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/email/resend", () => ({ sendRetentionEmail: vi.fn() }));
vi.mock("@/lib/push/send", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("@/lib/sms/send", () => ({ sendSms: vi.fn(), isSmsConfigured: () => false }));
import { buildRetentionMessage, frequentPushCopy } from "../send";
import { parseCustomerLanguage } from "@/lib/i18n/customer-language";

describe("customer language", () => {
  it("defaults to French for anything that is not English", () => {
    expect(parseCustomerLanguage("en")).toBe("en");
    expect(parseCustomerLanguage("fr")).toBe("fr");
    expect(parseCustomerLanguage("tr")).toBe("fr");
    expect(parseCustomerLanguage(null)).toBe("fr");
  });

  it("writes retention messages in the customer's language", () => {
    const fr = buildRetentionMessage("inactivity", "Café Lucide", "Jeanne Tremblay");
    const en = buildRetentionMessage("inactivity", "Café Lucide", "Jeanne Tremblay", undefined, "en");
    expect(fr.subject).toContain("votre table vous attend");
    expect(en.subject).toBe("Jeanne, your table is waiting at Café Lucide");
    expect(en.pushBody).toContain("Come see us");
  });

  it("keeps the reward points in English reward messages", () => {
    const en = buildRetentionMessage("reward_available", "Café Lucide", "Jeanne", { points: 120, rewardName: "Free coffee" }, "en");
    expect(en.subject).toContain("120 points");
    expect(en.bodyHtml).toContain("Free coffee");
  });

  it("has English frequent push copy", () => {
    const copy = frequentPushCopy("inactivity", "Café Lucide", "Jeanne", "seed", new Date("2026-10-05T12:00:00Z"), undefined, "en");
    expect(copy?.title).toBeTruthy();
    expect(`${copy?.title} ${copy?.body}`).not.toMatch(/vous|votre/);
  });
});
