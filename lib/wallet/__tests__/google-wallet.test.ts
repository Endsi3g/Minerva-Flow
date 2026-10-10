import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import { signJwtRS256 } from "../jwt";
import { buildGoogleBalanceFields, buildGoogleLoyaltyPayload, googleLoyaltyObjectId } from "../google-loyalty-payload";

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

  it("uses a logo URL that is a real public PNG on the canonical host", async () => {
    const { GOOGLE_WALLET_LOGO_URL } = await import("../google-loyalty-payload");
    expect(GOOGLE_WALLET_LOGO_URL).toBe("https://www.minervaflow.app/icon-512.png");
    expect(fs.existsSync("public/icon-512.png")).toBe(true);
    const payload = buildGoogleLoyaltyPayload({
      issuerId: "1", serviceAccountEmail: "a@b.iam.gserviceaccount.com", appUrl: "https://www.minervaflow.app",
      customerId: "c1", customerName: "N", restaurantId: "r1", restaurantName: "R", points: 1, tierLabel: "T",
      portalUrl: "https://www.minervaflow.app/portal", brandColorHex: "#167f5b",
    });
    expect(payload.payload.loyaltyClasses[0].programLogo.sourceUri.uri).toBe(GOOGLE_WALLET_LOGO_URL);
  });

  it("puts the customer's phone digits in the QR so the counter can find them", () => {
    const payload = buildGoogleLoyaltyPayload({
      issuerId: "1", serviceAccountEmail: "a@b.iam.gserviceaccount.com", appUrl: "https://www.minervaflow.app",
      customerId: "c1", customerName: "N", customerPhone: "(514) 555-0100", restaurantId: "r1", restaurantName: "R",
      points: 1, tierLabel: "T", portalUrl: "https://www.minervaflow.app/portal", brandColorHex: "#167f5b",
    });
    const barcode = payload.payload.loyaltyObjects[0].barcode;
    expect(barcode.value).toBe("5145550100");
    expect(barcode.alternateText).toBe("(514) 555-0100");
  });

  it("drops the country code so the QR matches what staff type (stored as +1…)", () => {
    const payload = buildGoogleLoyaltyPayload({
      issuerId: "1", serviceAccountEmail: "a@b.iam.gserviceaccount.com", appUrl: "https://www.minervaflow.app",
      customerId: "c1", customerName: "N", customerPhone: "+15145550100", restaurantId: "r1", restaurantName: "R",
      points: 1, tierLabel: "T", portalUrl: "https://www.minervaflow.app/portal", brandColorHex: "#167f5b",
    });
    expect(payload.payload.loyaltyObjects[0].barcode.value).toBe("5145550100");
  });

  const base = {
    issuerId: "1", serviceAccountEmail: "a@b.iam.gserviceaccount.com", appUrl: "https://www.minervaflow.app",
    customerId: "c1", customerName: "N", restaurantId: "r1", restaurantName: "R", points: 12, tierLabel: "Habitué",
    portalUrl: "https://www.minervaflow.app/portal?customer=c1", brandColorHex: "#167f5b",
  };

  it("explains how the card works and links to the customer's space, in French by default", () => {
    const object = buildGoogleLoyaltyPayload(base).payload.loyaltyObjects[0];
    expect(object.textModulesData[0]).toMatchObject({ header: "Comment ça marche" });
    expect(object.linksModuleData.uris[0]).toMatchObject({ uri: base.portalUrl, description: "Ouvrir mon espace fidélité" });
    expect(object.loyaltyPoints.label).toBe("Points");
    expect(object.secondaryLoyaltyPoints.label).toBe("Palier");
  });

  it("speaks English to English-speaking customers", () => {
    const object = buildGoogleLoyaltyPayload({ ...base, language: "en" }).payload.loyaltyObjects[0];
    expect(object.textModulesData[0].header).toBe("How it works");
    expect(object.secondaryLoyaltyPoints.label).toBe("Tier");
    expect(object.linksModuleData.uris[0].description).toBe("Open my loyalty account");
  });

  it("maps a customer to one stable Wallet object so balance updates can find the saved pass", () => {
    expect(googleLoyaltyObjectId("3388", "abc-123-def")).toBe("3388.customer_abc123def");
    expect(buildGoogleLoyaltyPayload({ ...base, issuerId: "3388", customerId: "abc-123-def" }).payload.loyaltyObjects[0].id).toBe("3388.customer_abc123def");
  });

  it("builds the balance fields used for later updates (never negative, rounded)", () => {
    expect(buildGoogleBalanceFields({ points: 41.6, tierLabel: "Privilégié" })).toEqual({
      loyaltyPoints: { label: "Points", balance: { string: "42" } },
      secondaryLoyaltyPoints: { label: "Palier", balance: { string: "Privilégié" } },
    });
    expect(buildGoogleBalanceFields({ points: -5, tierLabel: "x", language: "en" }).loyaltyPoints.balance.string).toBe("0");
  });
});
