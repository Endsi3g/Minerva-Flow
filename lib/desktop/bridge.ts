/**
 * Bridge to the Minerva Flow desktop shell (Tauri). Every function is a safe
 * no-op in a normal browser, so portal code can call it without checking first.
 * The shell exposes `window.__TAURI__` (withGlobalTauri) only to this origin.
 */

type TauriGlobal = {
  core: { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
  notification?: {
    isPermissionGranted: () => Promise<boolean>;
    requestPermission: () => Promise<string>;
    sendNotification: (options: { title: string; body?: string }) => void;
  };
};

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

export const DESKTOP_COOKIE = "mv_desktop";

export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI__?.core);
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isDesktopApp()) return null;
  try {
    return (await window.__TAURI__!.core.invoke(command, args)) as T;
  } catch (error) {
    console.warn(`[desktop] ${command} failed`, error);
    throw error;
  }
}

export async function getDesktopInfo(): Promise<{ name: string; version: string; platform: string } | null> {
  try {
    return await invoke("app_info");
  } catch {
    return null;
  }
}

/** Full-screen cash-register mode. Returns false outside the desktop app. */
export async function setKioskMode(enabled: boolean): Promise<boolean> {
  if (!isDesktopApp()) return false;
  await invoke("set_kiosk", { enabled });
  return true;
}

/** System print dialog for the current page. */
export async function printCurrentPage(): Promise<boolean> {
  if (!isDesktopApp()) {
    window.print();
    return true;
  }
  await invoke("print_page");
  return true;
}

/** Raw ESC/POS bytes to a thermal printer on the local network (port 9100 by default). */
export async function printEscPos(host: string, bytes: Uint8Array, port = 9100): Promise<boolean> {
  if (!isDesktopApp()) return false;
  await invoke("print_escpos", { host, port, data: Array.from(bytes) });
  return true;
}

/** System notification, asking for permission the first time. */
export async function notifyDesktop(title: string, body?: string): Promise<boolean> {
  const api = typeof window !== "undefined" ? window.__TAURI__?.notification : undefined;
  if (!api) return false;
  try {
    let granted = await api.isPermissionGranted();
    if (!granted) granted = (await api.requestPermission()) === "granted";
    if (!granted) return false;
    api.sendNotification({ title, body });
    return true;
  } catch {
    return false;
  }
}
