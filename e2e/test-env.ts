import dotenv from "dotenv";

// E2E must never inherit production credentials from .env.local. This ignored
// file is the only dotenv file read by the browser test harness.
dotenv.config({ path: ".env.test.local" });

const KNOWN_PRODUCTION_PROJECT_REFS = new Set(["vcfaianbdjowmiqaheee"]);

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env.test.local; E2E tests do not fall back to .env.local.`);
  return value;
}

function configureE2eEnvironment() {
  const supabaseUrl = required("E2E_TEST_SUPABASE_URL");
  const anonKey = required("E2E_TEST_SUPABASE_ANON_KEY");
  const serviceRoleKey = required("E2E_TEST_SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(supabaseUrl);
  const hostname = url.hostname.toLowerCase();
  const projectRef = hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : null;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (projectRef && KNOWN_PRODUCTION_PROJECT_REFS.has(projectRef)) {
    throw new Error("E2E refused to use Minerva Flow's production Supabase project.");
  }
  if (!isLocal) {
    const expectedRef = process.env.E2E_TEST_SUPABASE_PROJECT_REF?.trim();
    if (process.env.E2E_ALLOW_REMOTE_TEST_DB !== "true" || !projectRef || expectedRef !== projectRef) {
      throw new Error("Remote E2E databases require E2E_ALLOW_REMOTE_TEST_DB=true and an exact E2E_TEST_SUPABASE_PROJECT_REF match.");
    }
  }

  const appUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (appUrl) {
    const appHost = new URL(appUrl).hostname.toLowerCase();
    const isLocalApp = appHost === "localhost" || appHost === "127.0.0.1";
    if (!isLocalApp) {
      throw new Error("E2E browser flows only run against the local app until a verified isolated preview environment is configured.");
    }
  }

  // Force the dev server and tests to use one isolated database. Explicit
  // process variables win over Next.js loading .env.local in dev mode.
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

  // Simulated webhook tests can use a local/test Stripe key; never inherit a
  // live Stripe credential from the shell or Next.js' .env.local loader.
  const stripeTestKey = process.env.E2E_TEST_STRIPE_SECRET_KEY?.trim() || "sk_test_local";
  if (!stripeTestKey.startsWith("sk_test_")) {
    throw new Error("E2E_TEST_STRIPE_SECRET_KEY must be a Stripe test-mode key (sk_test_…).");
  }
  process.env.STRIPE_SECRET_KEY = stripeTestKey;
  process.env.STRIPE_WEBHOOK_SECRET = process.env.E2E_TEST_STRIPE_WEBHOOK_SECRET?.trim() || "whsec_local_e2e";

  // Suppress accidental calls to live integrations from the local E2E server.
  for (const name of [
    "RESEND_API_KEY", "GOOGLE_PLACES_API_KEY",
    "SQUARE_APPLICATION_ID", "SQUARE_APPLICATION_SECRET", "SQUARE_WEBHOOK_SIGNATURE_KEY",
    "CLOVER_APP_ID", "CLOVER_APP_SECRET", "CLOVER_WEBHOOK_AUTH_CODE",
    "TOAST_CLIENT_ID", "TOAST_CLIENT_SECRET", "TOAST_WEBHOOK_SECRET",
    "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
  ]) process.env[name] = "";

  return { supabaseUrl, anonKey, serviceRoleKey };
}

export const e2eTestDatabase = configureE2eEnvironment();
