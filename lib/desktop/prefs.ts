/** Per-computer settings of the desktop "poste de caisse", kept in localStorage. */

const KEY = "mv_desktop_station_v1";

export type StationPrefs = {
  orderAlert: boolean;
  printerHost: string;
  printerPort: number;
  autoPrintKitchen: boolean;
};

const DEFAULTS: StationPrefs = { orderAlert: true, printerHost: "", printerPort: 9100, autoPrintKitchen: false };

export function readStationPrefs(): StationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<StationPrefs>;
    const port = Number(parsed.printerPort);
    return {
      orderAlert: parsed.orderAlert !== false,
      printerHost: typeof parsed.printerHost === "string" ? parsed.printerHost.trim().slice(0, 253) : "",
      printerPort: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : 9100,
      autoPrintKitchen: parsed.autoPrintKitchen === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeStationPrefs(next: Partial<StationPrefs>): StationPrefs {
  const merged = { ...readStationPrefs(), ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // Storage can be blocked; the settings then last for this session only.
  }
  return merged;
}

/** Two short tones, generated locally so no audio file has to ship. */
export function playOrderChime(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    // Autoplay can be refused until the first click; the notification still shows.
  }
}
