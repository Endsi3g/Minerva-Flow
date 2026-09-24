import { describe, expect, it } from "vitest";
import { isExpectedClientDisconnect } from "@/lib/alerts/request-errors";
import { isIgnorableError } from "@/lib/alerts/error-notifier";

describe("isExpectedClientDisconnect", () => {
  it("recognizes Next.js render streams closed by a disconnected client", () => {
    const error = new Error("The destination stream closed early.");
    expect(isExpectedClientDisconnect(error)).toBe(true);
    expect(isIgnorableError(error)).toBe(true);
  });

  it("does not hide application and database failures", () => {
    expect(isExpectedClientDisconnect(new Error("profile query failed"))).toBe(false);
    expect(isExpectedClientDisconnect(new Error("The destination stream closed early: render failed"))).toBe(false);
    expect(isExpectedClientDisconnect("The destination stream closed early.")).toBe(false);
    expect(isIgnorableError(new Error("profile query failed"))).toBe(false);
  });
});
