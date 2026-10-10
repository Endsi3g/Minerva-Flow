# Replay vision — what's watching now

> ⚠️ **Needs your attention**
> - The session-summary scanner ("Résumés de session Flow") was created **disabled** on purpose — preview its output in PostHog, then enable it when you're happy with it.

## Recording status

Session replay is **enabled**, but it only records for end users who have explicitly
given consent through Minerva Flow's own consent flow (Quebec Law 25 compliance —
`lib/analytics-consent.ts`, `setSessionReplayConsent(true)`). Nothing changed here by
design: there's no broad default-on recording, so expect a smaller volume of sessions
than a typical PostHog project. No follow-up needed — this is the intended, compliant
behavior, not a gap. The PostHog SDK was already installed and initialized before this
run, so no install/init work was needed.

## Scanners created

### 1. Onboarding wizard frustration (monitor)
- **Watches:** clear signs a user got stuck or frustrated — rage-clicks (`$rageclick`)
  anywhere in the product, with specific attention to known friction points in the
  5-step onboarding wizard (loyalty QR/program link failing to generate, the Continue
  button staying blocked on name validation, an out-of-range points-per-dollar rate
  being rejected, fixing AI-menu-scan items before confirming import, sending a team
  invite during launch).
- **Query scope:** project-wide, gated only on the `$rageclick` event (no URL filter).
- **Sampling:** 1.0 (comprehensive).
- **Estimated spend:** ~0 credits/month today (0 matching sessions in the last 7 days)
  — cost will track actual rage-click volume as consented traffic grows.
- **Link:** https://us.posthog.com/project/575536/replay-vision/01a126e8-08a7-7e8e-b110-8b0970a4b653

### 2. Onboarding wizard breakage (monitor)
- **Watches:** outright breakage during sign-up and onboarding — the loyalty QR card
  staying blank, the Continue button doing nothing, a rejected points rate with no
  visible reason, a stalled AI menu import, or the launch step failing to finish.
- **Query scope:** URL-scoped to `/sign-up` and `/onboarding` (regex OR) — this covers
  the entire onboarding wizard since all 5 steps live under one route.
- **Sampling:** 0.5 (comprehensive).
- **Estimated spend:** ~0 credits/month today (0 matching sessions in the last 7 days).
- **Link:** https://us.posthog.com/project/575536/replay-vision/01a126e9-df66-7474-842c-84afc5351957

These two monitors are deliberately disjoint — frustration watches an event
(`$rageclick`) anywhere, breakage watches a URL scope — so they won't double-report
the same observation.

### 3. Résumés de session Flow (summarizer)
- **Watches:** general session summaries across the product, written in French to
  match the app's own UI language and vocabulary (tableau de bord, fidélisation,
  réputation, menu, commandes, horaire, collaborateurs).
- **Query scope:** unscoped — all recorded sessions.
- **Sampling:** 0.1.
- **Status:** created **disabled** on purpose, to preview summaries on real sessions
  before turning it on continuously. Someone needs to review the preview and flip it
  on when ready.
- **Estimated spend:** ~0 credits/month at current (low, consent-gated) recording volume.
- **Link:** https://us.posthog.com/project/575536/replay-vision/01a126e5-12df-7a54-aba3-24f586198a52

## Total estimated cost

All three scanners project ~0 credits/month right now, against a 2,500 free monthly
credit quota, because consent-gated recording keeps session volume low. Spend will
rise with consented traffic — re-run the estimate periodically if volume grows.

## Skipped / deferred

- Nothing was skipped as "not applicable" — Minerva Flow's one business-critical flow
  (onboarding) and general product usage are both covered. The only deferred action is
  enabling the summarizer scanner after reviewing its preview output.

## Where to look

All three scanners live on the Replay vision page:
https://us.posthog.com/project/575536/replay-vision

First observations will appear as new **consented** recordings complete and get
scanned — given the low recording volume, expect results to trickle in rather than
appear immediately.
