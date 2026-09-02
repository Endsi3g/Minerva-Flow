import crypto from "node:crypto";

/**
 * Minimal RS256 JWT signer — no "server-only" guard and no env reads of its
 * own, so it's plain, directly-testable logic. The secret-handling (reading
 * the private key from env) stays in google-wallet.ts, which does carry
 * "server-only".
 */
export function signJwtRS256(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const base64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKeyPem);
  return `${signingInput}.${base64url(signature)}`;
}
