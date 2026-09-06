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
 * See native/ios/build-status.html for how to obtain these.
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

/**
 * Sends one APNs push per device token. Never throws — a push failure
 * must not break the notification flow that triggered it, same
 * never-throws contract as sendPushToUsers. A token APNs reports as
 * unregistered (410/BadDeviceToken) is deleted so it stops being retried.
 */
export async function sendAPNsToUsers(userIds: string[], payload: ApnsPayload): Promise<void> {
  if (!isAPNsConfigured() || userIds.length === 0) return;

  const admin = createAdminClient();
  const { data } = await admin.from("device_push_tokens").select("token").in("user_id", userIds);
  const tokens = ((data as { token: string }[] | null) ?? []).map((row) => row.token);
  if (tokens.length === 0) return;

  const host = process.env.APNS_ENVIRONMENT === "production" ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const authToken = buildAuthToken();
  const body = JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
    link: payload.link,
  });

  await Promise.all(
    tokens.map(
      (token) =>
        new Promise<void>((resolve) => {
          const client = http2.connect(`https://${host}`);
          client.on("error", (err) => {
            console.error("APNs connection failed:", err);
            resolve();
          });

          const req = client.request({
            ":method": "POST",
            ":path": `/3/device/${token}`,
            authorization: `bearer ${authToken}`,
            "apns-topic": process.env.APNS_BUNDLE_ID!,
            "apns-push-type": "alert",
            "content-type": "application/json",
          });

          let status = 0;
          req.on("response", (headers) => {
            status = Number(headers[":status"] ?? 0);
          });
          req.on("data", () => {});
          req.on("end", async () => {
            if (status === 410 || status === 400) {
              await admin.from("device_push_tokens").delete().eq("token", token);
            }
            client.close();
            resolve();
          });
          req.on("error", (err) => {
            console.error("APNs request failed:", err);
            client.close();
            resolve();
          });

          req.end(body);
        })
    )
  );
}
