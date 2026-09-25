// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Keep this separate from NEXT_PUBLIC_SENTRY_DSN, which already exists in
  // the linked Vercel project and blocked the new Marketplace resource from
  // connecting. DSNs are public client identifiers, not auth tokens.
  dsn:
    process.env.NEXT_PUBLIC_MINERVA_SENTRY_DSN ??
    "https://06040e3c08522cfaf3bf87729f1e942f@o4512147373686784.ingest.us.sentry.io/4512147451215872",
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  enableLogs: false,
  // Replay remains disabled until a consent/retention policy is in place.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    stackFrameVariables: false,
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
  // The dated "defaults" bundle gates initial pageview capture behind a
  // consent check (isOptedIn) that this app never satisfies — there's no
  // consent banner anywhere, so every pageview was silently dropped despite
  // init/config/flags requests succeeding normally. Force capture on so it
  // doesn't depend on an implicit consent flow this app doesn't implement.
  capture_pageview: true,
  opt_out_capturing_by_default: false,
});
