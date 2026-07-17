import "server-only";
import { randomUUID } from "crypto";

/** Opaque, unique, URL-safe token for public share links (menu/report/expense/referral). */
export function generateToken(length?: number): string {
  const token = randomUUID().replace(/-/g, "");
  return length ? token.slice(0, length) : token;
}
