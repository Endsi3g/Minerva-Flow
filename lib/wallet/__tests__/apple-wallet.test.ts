import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

vi.mock("server-only", () => ({}));

/** Minimal zip reader: returns each stored/deflated entry by name. */
function readZip(buf: Buffer): Record<string, Buffer> {
  const files: Record<string, Buffer> = {};
  let i = 0;
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const flags = buf.readUInt16LE(i + 6);
    const method = buf.readUInt16LE(i + 8);
    let compressedSize = buf.readUInt32LE(i + 18);
    const nameLength = buf.readUInt16LE(i + 26);
    const extraLength = buf.readUInt16LE(i + 28);
    const name = buf.toString("utf8", i + 30, i + 30 + nameLength);
    const dataStart = i + 30 + nameLength + extraLength;
    if (flags & 0x8) {
      // sizes follow the data (data descriptor): find the next header
      let next = dataStart;
      while (next < buf.length && !(buf.readUInt32LE(next) === 0x08074b50)) next++;
      compressedSize = next - dataStart;
      files[name] = method === 8 ? zlib.inflateRawSync(buf.subarray(dataStart, next)) : buf.subarray(dataStart, next);
      i = next + 16;
    } else {
      const data = buf.subarray(dataStart, dataStart + compressedSize);
      files[name] = method === 8 ? zlib.inflateRawSync(data) : data;
      i = dataStart + compressedSize;
    }
  }
  return files;
}

let certDir = "";
beforeAll(() => {
  certDir = fs.mkdtempSync(path.join(os.tmpdir(), "pkpass-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "key.pem", "-out", "cert.pem", "-days", "2", "-subj", "/CN=Test Pass Signer"], { cwd: certDir, stdio: "ignore" });
  process.env.APPLE_WALLET_WWDR_CERT = fs.readFileSync(path.join(certDir, "cert.pem"), "utf8");
  process.env.APPLE_WALLET_SIGNER_CERT = fs.readFileSync(path.join(certDir, "cert.pem"), "utf8");
  process.env.APPLE_WALLET_SIGNER_KEY = fs.readFileSync(path.join(certDir, "key.pem"), "utf8");
  process.env.APPLE_WALLET_PASS_TYPE_ID = "pass.test.minerva";
  process.env.APPLE_WALLET_TEAM_ID = "ABCDE12345";
});

describe("buildAppleLoyaltyPass", () => {
  it("builds a pass Wallet can add: icons present, no dangling web service, phone in the QR", async () => {
    const { buildAppleLoyaltyPass } = await import("../apple-wallet");
    const files = readZip(
      await buildAppleLoyaltyPass({
        customerId: "c1", customerName: "Client Test", customerPhone: "+15145550100",
        restaurantName: "Minerva Flow — Démo", points: 255, tierLabel: "Privilégié", portalUrl: "https://www.minervaflow.app/portal",
      })
    );
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["pass.json", "manifest.json", "signature", "icon.png", "icon@2x.png", "icon@3x.png", "logo.png"]));
    const pass = JSON.parse(files["pass.json"].toString());
    expect(pass.webServiceURL).toBeUndefined();
    expect(pass.authenticationToken).toBeUndefined();
    expect(pass.storeCard.primaryFields[0]).toMatchObject({ key: "points", value: "255" });
    expect(pass.storeCard.secondaryFields[0].value).toBe("Privilégié");
    expect(pass.barcodes[0]).toMatchObject({ format: "PKBarcodeFormatQR", message: "5145550100" });
    expect(files["icon.png"].subarray(1, 4).toString()).toBe("PNG");
  });

  it("falls back to the customer id when there is no phone number", async () => {
    const { buildAppleLoyaltyPass } = await import("../apple-wallet");
    const files = readZip(
      await buildAppleLoyaltyPass({ customerId: "abc-123", customerName: "N", restaurantName: "R", points: 1, tierLabel: "Membre", portalUrl: "https://x" })
    );
    expect(JSON.parse(files["pass.json"].toString()).barcodes[0].message).toBe("abc-123");
  });
});
