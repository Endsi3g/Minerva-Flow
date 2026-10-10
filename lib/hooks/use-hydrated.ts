"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Keep interactive controls disabled until React can handle their input. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
