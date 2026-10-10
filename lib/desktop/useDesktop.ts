"use client";

import { useSyncExternalStore } from "react";
import { isDesktopApp } from "@/lib/desktop/bridge";

const subscribe = () => () => {};

/** True only inside the desktop app; false on the server and in browsers. */
export function useIsDesktopApp(): boolean {
  return useSyncExternalStore(subscribe, isDesktopApp, () => false);
}
