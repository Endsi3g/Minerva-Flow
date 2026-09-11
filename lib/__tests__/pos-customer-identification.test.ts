import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  getLocalPhoneDigits,
  formatPhoneDisplay,
  isValidPhoneNumber,
  sanitizePhoneInput,
} from "@/lib/phone";
import { buildGoogleLoyaltyPayload } from "@/lib/wallet/google-loyalty-payload";
import type { PosTicket } from "@/lib/pos/ticket-ingestion";

describe("Cashier Identification & Phone Normalization Engine", () => {
  describe("Phone Number Normalization & Sanitization", () => {
    it("sanitizes phone inputs by stripping spaces, dashes and brackets", () => {
      expect(sanitizePhoneInput("(514) 555-1234")).toBe("5145551234");
      expect(sanitizePhoneInput("+1 (514) 555-1234")).toBe("+15145551234");
      expect(sanitizePhoneInput(" 514.555.1234 ")).toBe("5145551234");
    });

    it("normalizes North American 10-digit numbers to E.164 (+1)", () => {
      expect(normalizePhoneNumber("5145551234")).toBe("+15145551234");
      expect(normalizePhoneNumber("(438) 999-0011")).toBe("+14389990011");
      expect(normalizePhoneNumber("418-222-3344")).toBe("+14182223344");
    });

    it("normalizes North American 11-digit numbers with leading 1", () => {
      expect(normalizePhoneNumber("15145551234")).toBe("+15145551234");
      expect(normalizePhoneNumber("1-514-555-1234")).toBe("+15145551234");
    });

    it("normalizes French / European 10-digit numbers starting with 0", () => {
      expect(normalizePhoneNumber("06 12 34 56 78")).toBe("+33612345678");
      expect(normalizePhoneNumber("0711223344")).toBe("+33711223344");
    });

    it("preserves already valid international E.164 numbers", () => {
      expect(normalizePhoneNumber("+447911123456")).toBe("+447911123456");
      expect(normalizePhoneNumber("+15145551234")).toBe("+15145551234");
    });

    it("rejects invalid or too short strings", () => {
      expect(normalizePhoneNumber("")).toBeNull();
      expect(normalizePhoneNumber("12345")).toBeNull();
      expect(normalizePhoneNumber("abc")).toBeNull();
      expect(isValidPhoneNumber("not-a-number")).toBe(false);
      expect(isValidPhoneNumber("5145551234")).toBe(true);
    });

    it("extracts clean 10 local digits for POS barcode keyboard emulation", () => {
      expect(getLocalPhoneDigits("+15145551234")).toBe("5145551234");
      expect(getLocalPhoneDigits("(514) 555-1234")).toBe("5145551234");
      expect(getLocalPhoneDigits("15145551234")).toBe("5145551234");
    });

    it("formats phone numbers with luxury editorial typography", () => {
      expect(formatPhoneDisplay("+15145551234")).toBe("(514) 555-1234");
      expect(formatPhoneDisplay("5145551234")).toBe("(514) 555-1234");
      expect(formatPhoneDisplay("+33612345678")).toBe("+33612345678");
    });
  });

  describe("QR Code & Digital Wallet Payload Formatting", () => {
    it("encodes normalized phone digits into the QR barcode when customer phone is available", () => {
      const payload = buildGoogleLoyaltyPayload({
        issuerId: "test-issuer",
        serviceAccountEmail: "wallet@minervaflow.app",
        appUrl: "https://minervaflow.app",
        customerId: "cust-001",
        customerName: "Marc-André Fournier",
        customerPhone: "(514) 555-1234",
        restaurantId: "resto-001",
        restaurantName: "Le Trèfle Doré",
        points: 450,
        tierLabel: "Privilégié",
        portalUrl: "https://minervaflow.app/portal",
        brandColorHex: "#167f5b",
      });

      const loyaltyObj = payload.payload.loyaltyObjects[0];
      // Must encode raw digits so a 2D POS USB scanner types it straight into the POS register
      expect(loyaltyObj.barcode.value).toBe("5145551234");
      expect(loyaltyObj.barcode.alternateText).toBe("(514) 555-1234");
    });

    it("falls back to 6-digit pairing code or portal url if phone is not provided", () => {
      const payloadWithCode = buildGoogleLoyaltyPayload({
        issuerId: "test-issuer",
        serviceAccountEmail: "wallet@minervaflow.app",
        appUrl: "https://minervaflow.app",
        customerId: "cust-002",
        customerName: "Camille Lortie",
        pairingCode: "849201",
        restaurantId: "resto-002",
        restaurantName: "Bureau & Brew",
        points: 80,
        tierLabel: "Habitué",
        portalUrl: "https://minervaflow.app/portal",
        brandColorHex: "#0e5a40",
      });

      const loyaltyObj = payloadWithCode.payload.loyaltyObjects[0];
      expect(loyaltyObj.barcode.value).toBe("849201");
      expect(loyaltyObj.barcode.alternateText).toBe("Code : 849201");
    });
  });

  describe("POS Ticket Structure & Identification Attributes", () => {
    it("supports customerPhone, customerEmail, guestName and externalCustomerId on PosTicket", () => {
      const ticket: PosTicket = {
        externalOrderId: "sq-order-987654",
        closedAt: "2026-09-10T19:30:00Z",
        subtotal: 42.5,
        taxAmount: 6.36,
        tipAmount: 7.0,
        total: 55.86,
        guestName: "Jade Simard",
        customerPhone: "+15145559876",
        customerEmail: "jade@burgernomade.ca",
        externalCustomerId: "sq-cust-abc",
        lineItems: [
          {
            externalItemId: "item-burger-double",
            name: "Burger Double Smash",
            quantity: 2,
            unitPrice: 18.5,
          },
        ],
      };

      expect(ticket.guestName).toBe("Jade Simard");
      expect(ticket.customerPhone).toBe("+15145559876");
      expect(ticket.customerEmail).toBe("jade@burgernomade.ca");
      expect(ticket.externalCustomerId).toBe("sq-cust-abc");
      expect(ticket.lineItems).toHaveLength(1);
      expect(ticket.total).toBe(55.86);
    });
  });
});
