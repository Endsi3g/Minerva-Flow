"use client";

import { useSyncExternalStore } from "react";

export function usePushBrowserSupport() {
  return useSyncExternalStore(
    () => () => {},
    () => "Notification" in window && "serviceWorker" in navigator && "PushManager" in window,
    () => false
  );
}
