"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

type Listener = () => void;
type StorageKind = "local" | "session";
const listenersByKey = new Map<string, Set<Listener>>();
const memoryFallback = new Map<string, string | null>();

function subscribe(key: string, kind: StorageKind, listener: Listener) {
  const identity = `${kind}:${key}`;
  let listeners = listenersByKey.get(identity);
  if (!listeners) {
    listeners = new Set();
    listenersByKey.set(identity, listeners);
  }
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    try {
      const storage = kind === "session" ? sessionStorage : localStorage;
      if (!event.storageArea || event.storageArea === storage) {
        memoryFallback.delete(identity);
        listener();
      }
    } catch { listener(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners?.delete(listener);
    window.removeEventListener("storage", onStorage);
    if (listeners?.size === 0) listenersByKey.delete(identity);
  };
}

function notify(key: string) {
  listenersByKey.get(key)?.forEach((listener) => listener());
}

export function useLocalStorageState<T>(
  key: string,
  serverValue: T,
  parse: (value: string | null) => T,
  serialize: (value: T) => string | null,
  storageKind: StorageKind = "local"
): [T, (value: T) => void] {
  const cache = useRef<{ key: string; raw: string | null; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const cacheKey = `${storageKind}:${key}`;
    let raw: string | null;
    try {
      const storage = storageKind === "session" ? sessionStorage : localStorage;
      raw = memoryFallback.has(cacheKey) ? memoryFallback.get(cacheKey)! : storage.getItem(key);
    } catch {
      raw = memoryFallback.has(cacheKey) ? memoryFallback.get(cacheKey)! : null;
    }
    if (!cache.current || cache.current.key !== cacheKey || cache.current.raw !== raw) {
      cache.current = { key: cacheKey, raw, value: parse(raw) };
    }
    return cache.current.value;
  }, [key, storageKind, parse]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);
  const value = useSyncExternalStore(
    (listener) => subscribe(key, storageKind, listener),
    getSnapshot,
    getServerSnapshot
  );

  const setValue = useCallback((next: T) => {
    const serialized = serialize(next);
    try {
      const storage = storageKind === "session" ? sessionStorage : localStorage;
      if (serialized === null) storage.removeItem(key);
      else storage.setItem(key, serialized);
      memoryFallback.delete(`${storageKind}:${key}`);
    } catch {
      // Restricted browsers may deny storage; retain the preference for this page.
      memoryFallback.set(`${storageKind}:${key}`, serialized);
    }
    cache.current = { key: `${storageKind}:${key}`, raw: serialized, value: next };
    notify(`${storageKind}:${key}`);
  }, [key, storageKind, serialize]);

  return [value, setValue];
}

export function useLocalStorageBoolean(
  key: string,
  serverValue = true,
  trueValue = "1",
  storageKind: StorageKind = "local"
): [boolean, (value: boolean) => void] {
  const parse = useCallback((raw: string | null) => raw === trueValue, [trueValue]);
  const serialize = useCallback((value: boolean) => value ? trueValue : null, [trueValue]);
  return useLocalStorageState(key, serverValue, parse, serialize, storageKind);
}

export function useClientHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}
