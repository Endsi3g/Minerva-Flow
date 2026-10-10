import http2 from "node:http2";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * APNs sender for the native iOS app — separate delivery channel from
 * lib/push/send.ts's Web Push (VAPID/web-push), which only reaches
 * browsers/installed PWAs and can never reach a native Swift app. No
 * external dependency: the auth token is a JWT (ES256) built by hand with
 * Node's own `crypto`, since the whole payload is two base64url JSON
 * blobs plus one signature — not enough surface to justify pulling in a
 * JWT library for it.
 *
 * Configure via APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the .p8
 * file's contents, PEM format, literal newlines or \n-escaped both work),
 * APNS_BUNDLE_ID, and APNS_ENVIRONMENT ("sandbox" while sideloaded via
 * Xcode, "production" once distributed through TestFlight/the App Store).
 * See docs/mobile/native-build-status.html for how to obtain these.
 */
export function isAPNsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_PRIVATE_KEY &&
      process.env.APNS_BUNDLE_ID
  );
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// APNs accepts the same signing token for up to an hour — cached here so
// a burst of notifications (e.g. one new offer notifying 500 customers)
// signs once, not once per device.
let cachedToken: { token: string; issuedAt: number } | null = null;

function buildAuthToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now - cachedToken.issuedAt < 60 * 40) return cachedToken.token;

  const header = base64url(Buffer.from(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID })));
  const payload = base64url(Buffer.from(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: now })));
  const signingInput = `${header}.${payload}`;

  const privateKey = process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const signature = crypto.sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363", // JWS wants raw r||s, not the DER encoding Node signs by default
  });

  const token = `${signingInput}.${base64url(signature)}`;
  cachedToken = { token, issuedAt: now };
  return token;
}

type ApnsPayload = { title: string; body?: string; link?: string };
type ApnsEnvironment = "sandbox" | "production";
type TokenTarget = { token: string; environment: ApnsEnvironment | null };

const APNS_HOSTS: Record<ApnsEnvironment, string> = {
  sandbox: "api.sandbox.push.apple.com",
  production: "api.push.apple.com",
};

function defaultEnvironment(): ApnsEnvironment {
  return process.env.APNS_ENVIRONMENT === "production" ? "production" : "sandbox";
}

type ApnsResult = { status: number; reason: string | null };

function sendOne(token: string, environment: ApnsEnvironment, body: string, authToken: string): Promise<ApnsResult> {
  return new Promise<ApnsResult>((resolve) => {
    const client = http2.connect(`https://${APNS_HOSTS[environment]}`);
    let settled = false;
    const finish = (result: ApnsResult) => {
      if (settled) return;
      settled = true;
      client.close();
      resolve(result);
    };
    client.on("error", (err) => {
      console.error("APNs connection failed:", err);
      finish({ status: 0, reason: "connection" });
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${authToken}`,
      "apns-topic": process.env.APNS_BUNDLE_ID!,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let status = 0;
    let raw = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    req.on("data", (chunk: string) => {
      raw += chunk;
    });
    req.on("end", () => {
      let reason: string | null = null;
      try {
        reason = (JSON.parse(raw) as { reason?: string }).reason ?? null;
      } catch {
        reason = null;
      }
      finish({ status, reason });
    });
    req.on("error", (err) => {
      console.error("APNs request failed:", err);
      finish({ status: 0, reason: "request" });
    });
    req.end(body);
  });
}

const DEAD_TOKEN_REASONS = new Set(["Unregistered", "BadDeviceToken", "DeviceTokenNotForTopic"]);

/**
 * Sends one APNs push per device token and returns how many devices Apple
 * accepted. Never throws — a push failure must not break the notification
 * flow that triggered it. A token is deleted only when Apple confirms it is
 * dead in the right environment: when the environment is unknown the other
 * host is tried first, because a sandbox (Xcode) token sent to production
 * answers BadDeviceToken even though it is perfectly valid.
 */
export async function sendAPNsToTokens(targets: Array<string | TokenTarget>, payload: ApnsPayload): Promise<number> {
  if (!isAPNsConfigured() || targets.length === 0) return 0;

  const admin = createAdminClient();
  const authToken = buildAuthToken();
  const body = JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
    link: payload.link,
  });

  const results = await Promise.all(
    targets.map(async (target) => {
      const { token, environment } = typeof target === "string" ? { token: target, environment: null } : target;
      const first = environment ?? defaultEnvironment();
      let result = await sendOne(token, first, body, authToken);
      if (result.status !== 200 && result.status !== 0 && !environment && result.reason === "BadDeviceToken") {
        const other: ApnsEnvironment = first === "production" ? "sandbox" : "production";
        const retry = await sendOne(token, other, body, authToken);
        if (retry.status === 200) {
          await admin.from("device_push_tokens").update({ apns_environment: other }).eq("token", token);
          return true;
        }
        result = retry;
      }
      if (result.status === 200) return true;
      console.error("APNs rejected a notification:", result.status, result.reason);
      if (result.status === 410 || (result.reason && DEAD_TOKEN_REASONS.has(result.reason))) {
        await admin.from("device_push_tokens").delete().eq("token", token);
      }
      return false;
    })
  );
  return results.filter(Boolean).length;
}

export { sendAPNsToTokens as sendApnsToTokens };

export async function sendAPNsToUsers(userIds: string[], payload: ApnsPayload): Promise<number> {
  if (!isAPNsConfigured() || userIds.length === 0) return 0;

  const admin = createAdminClient();
  const { data } = await admin.from("device_push_tokens").select("token, apns_environment").in("user_id", userIds);
  const rows = (data as { token: string; apns_environment: ApnsEnvironment | null }[] | null) ?? [];
  if (rows.length === 0) return 0;

  return sendAPNsToTokens(rows.map((row) => ({ token: row.token, environment: row.apns_environment })), payload);
}
