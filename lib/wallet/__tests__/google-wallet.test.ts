import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { signJwtRS256 } from "../jwt";
import { buildGoogleLoyaltyPayload } from "../google-loyalty-payload";

/**
 * google-wallet.ts itself carries "server-only" and reads real service-
 * account env vars that don't exist in this environment, so it can't be
 * imported directly here (server-only throws under vitest's jsdom
 * environment — same constraint referral-roi.test.ts documents). Its two
 * building blocks are plain, secret-free functions, though, and are tested
 * directly: signJwtRS256 (generic RS256 JWT signing, proven against a
 * throwaway test key pair) and buildGoogleLoyaltyPayload (the Google
 * Wallet payload shape, which takes every identifier as a parameter
 * instead of reading env).
 */
describe("signJwtRS256", () => {
  it("produces a JWT whose signature verifies against the matching public key", () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const jwt = signJwtRS256({ hello: "world", n: 42 }, privateKey);
    const [headerB64, payloadB64, signatureB64] = jwt.split(".");

    expect(JSON.parse(Buffer.from(headerB64, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payloadB64, "base64url").toString())).toEqual({ hello: "world", n: 42 });

    const verified = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${headerB64}.${payloadB64}`),
      publicKey,
      Buffer.from(signatureB64, "base64url")
    );
    expect(verified).toBe(true);
  });

  it("fails verification against a different key pair (proves it's a real signature, not a no-op)", () => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const { publicKey: unrelatedPublicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const publicPem = unrelatedPublicKey.export({ type: "spki", format: "pem" }) as string;

    const jwt = signJwtRS256({ a: 1 }, privatePem);
    const [headerB64, payloadB64, signatureB64] = jwt.split(".");
    const verified = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${headerB64}.${payloadB64}`),
      publicPem,
      Buffer.from(signatureB64, "base64url")
    );
    expect(verified).toBe(false);
  });
});

describe("buildGoogleLoyaltyPayload", () => {
  it("shapes a savetowallet JWT payload carrying the customer's real points and portal link", () => {
    const payload = buildGoogleLoyaltyPayload({
      issuerId: "test-issuer-1234",
      serviceAccountEmail: "wallet@test-project.iam.gserviceaccount.com",
      appUrl: "https://minervaflow.app",
      customerId: "cust-abc-123",
      customerName: "Alex Tremblay",
      restaurantId: "resto-xyz-789",
      restaurantName: "Le Trèfle Doré",
      points: 240,
      tierLabel: "Ambassadeur",
      portalUrl: "https://minervaflow.app/portal",
      brandColorHex: "#167f5b",
    });

    expect(payload.iss).toBe("wallet@test-project.iam.gserviceaccount.com");
    expect(payload.aud).toBe("google");
    expect(payload.typ).toBe("savetowallet");
    expect(payload.origins).toEqual(["https://minervaflow.app"]);

    const loyaltyObject = payload.payload.loyaltyObjects[0];
    expect(loyaltyObject.accountId).toBe("cust-abc-123");
    expect(loyaltyObject.accountName).toBe("Alex Tremblay");
    expect(loyaltyObject.loyaltyPoints.balance.string).toBe("240");
    expect(loyaltyObject.secondaryLoyaltyPoints.balance.string).toBe("Ambassadeur");
    expect(loyaltyObject.barcode.value).toBe("https://minervaflow.app/portal");
    expect(loyaltyObject.classId).toBe(payload.payload.loyaltyClasses[0].id);

    expect(payload.payload.loyaltyClasses[0].programName).toBe("Le Trèfle Doré");
    expect(payload.payload.loyaltyClasses[0].hexBackgroundColor).toBe("#167f5b");
  });
});
