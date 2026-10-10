"use client";

import posthog from "posthog-js";

const KEY = "mv_session_replay_consent";

export function hasSessionReplayConsent(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Starts or stops session replay for this browser. Off unless the person agrees. */
export function setSessionReplayConsent(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, enabled ? "1" : "0");
  } catch {
    // Storage can be blocked; the choice then lasts for this page view only.
  }
  if (enabled) {
    posthog.set_config({ disable_session_recording: false });
    posthog.startSessionRecording();
  } else {
    posthog.stopSessionRecording();
    posthog.set_config({ disable_session_recording: true });
  }
}

/** Feature flag read (create flags in PostHog; unknown flags are false). */
export function isFlagEnabled(flag: string): boolean {
  return posthog.isFeatureEnabled(flag) === true;
}
