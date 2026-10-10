import { describe, it, expect } from "vitest";

describe("Auth error filtering & mapping", () => {
  function isExpectedAuthError(err: unknown, localizedMessages: Record<string, string>): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    return (
      lower.includes("invalid login credentials") ||
      lower.includes("already registered") ||
      lower.includes("already exists") ||
      lower.includes("user already registered") ||
      Object.values(localizedMessages).includes(msg)
    );
  }

  const mockTranslations = {
    errorPasswordMismatch: "Les mots de passe ne correspondent pas.",
    errorAlreadyRegistered: "Votre compte est déjà créé dans l'application, veuillez vous connecter.",
    errorInvalidCredentials: "Le mot de passe n'est pas bon, réessayez.",
  };

  it("identifies AuthApiError invalid login credentials as expected", () => {
    const err = new Error("AuthApiError: Invalid login credentials");
    expect(isExpectedAuthError(err, mockTranslations)).toBe(true);
  });

  it("identifies already registered errors as expected", () => {
    const err = new Error(mockTranslations.errorAlreadyRegistered);
    expect(isExpectedAuthError(err, mockTranslations)).toBe(true);
  });

  it("identifies raw Supabase already registered string", () => {
    const err = new Error("User already registered");
    expect(isExpectedAuthError(err, mockTranslations)).toBe(true);
  });

  it("does not filter unexpected server or database errors", () => {
    const serverErr = new Error("Database connection pool exhausted (500)");
    expect(isExpectedAuthError(serverErr, mockTranslations)).toBe(false);
  });

  it("does not filter network failures or unknown errors", () => {
    const networkErr = new Error("Failed to fetch /auth/v1/signup");
    expect(isExpectedAuthError(networkErr, mockTranslations)).toBe(false);
  });
});
