import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { isIgnorableError, notifyCriticalError } from "@/lib/alerts/error-notifier";
import { createSafeAction } from "@/lib/server-action-wrapper";

describe("isIgnorableError", () => {
  it("filters out Next.js NEXT_REDIRECT and NEXT_NOT_FOUND digests", () => {
    const redirectErr = new Error("NEXT_REDIRECT;replace;/login;307;");
    (redirectErr as any).digest = "NEXT_REDIRECT;replace;/login;307;";
    expect(isIgnorableError(redirectErr)).toBe(true);

    const notFoundErr = new Error("NEXT_NOT_FOUND");
    (notFoundErr as any).digest = "NEXT_NOT_FOUND";
    expect(isIgnorableError(notFoundErr)).toBe(true);
  });

  it("filters out normal user login mistypes", () => {
    const invalidCredentialsErr = new Error("Invalid login credentials");
    expect(isIgnorableError(invalidCredentialsErr)).toBe(true);

    const userExistsErr = new Error("User already registered");
    expect(isIgnorableError(userExistsErr)).toBe(true);
  });

  it("filters out client connection cancellations", () => {
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    expect(isIgnorableError(abortErr)).toBe(true);
  });

  it("identifies real critical bugs as non-ignorable", () => {
    const dbErr = new Error("FATAL: connection to server at postgres failed: Connection refused");
    expect(isIgnorableError(dbErr)).toBe(false);

    const typeErr = new TypeError("Cannot read properties of undefined (reading 'split')");
    expect(isIgnorableError(typeErr)).toBe(false);

    const auth500 = new Error("Internal server error during token refresh");
    expect(isIgnorableError(auth500)).toBe(false);
  });
});

describe("notifyCriticalError deduplication", () => {
  it("suppresses repeated duplicate error fingerprints within suppression window", async () => {
    const uniqueError = new Error(`Unique test error ${Date.now()}`);
    
    // First call
    const first = await notifyCriticalError({
      error: uniqueError,
      source: "server_action",
    });

    // Second immediate call with identical error
    const second = await notifyCriticalError({
      error: uniqueError,
      source: "server_action",
    });

    // The second call must be suppressed by deduplication
    expect(second.sent).toBe(false);
    expect(second.reason).toBe("deduplicated_suppression_active");
  });

  it("ignores benign errors without sending email", async () => {
    const benign = new Error("NEXT_REDIRECT");
    (benign as any).digest = "NEXT_REDIRECT";

    const result = await notifyCriticalError({ error: benign });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("ignorable_error");
  });
});

describe("createSafeAction defensive wrapper", () => {
  it("returns { ok: true, data } on successful action execution", async () => {
    const successfulAction = createSafeAction(async (a: number, b: number) => {
      return a + b;
    });

    const result = await successfulAction(5, 7);
    expect(result).toEqual(12);
  });

  it("catches unhandled exceptions and returns graceful error without throwing", async () => {
    const crashingAction = createSafeAction(async (): Promise<string> => {
      throw new Error("Catastrophic database failure");
    }, { actionName: "testCrash" });

    const result = await crashingAction();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Un incident technique temporaire");
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("rethrows Next.js redirects so navigation flows normally", async () => {
    const redirectingAction = createSafeAction(async () => {
      const redirectErr = new Error("NEXT_REDIRECT");
      (redirectErr as any).digest = "NEXT_REDIRECT;replace;/dashboard;307;";
      throw redirectErr;
    });

    await expect(redirectingAction()).rejects.toThrow("NEXT_REDIRECT");
  });
});
