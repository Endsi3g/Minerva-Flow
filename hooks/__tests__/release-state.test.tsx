import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";


class TestStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}
const storageWindow = { localStorage: new TestStorage(), sessionStorage: new TestStorage(), Storage: TestStorage };
import { useClientHydrated, useLocalStorageBoolean, useLocalStorageState } from "@/hooks/use-local-storage-state";
import { normalizeFileCount } from "@/hooks/normalize-file-count";
import { firstJoinedRow } from "@/lib/data/first-joined-row";

beforeEach(() => {
  storageWindow.localStorage.clear();
  storageWindow.sessionStorage.clear();
  vi.stubGlobal("localStorage", storageWindow.localStorage);
  vi.stubGlobal("sessionStorage", storageWindow.sessionStorage);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("persisted browser state", () => {
  it("uses the server value for SSR without reading browser storage", () => {
    function Probe() {
      const [value] = useLocalStorageBoolean("ssr", true);
      return <span>{String(value)}</span>;
    }
    const getter = vi.spyOn(storageWindow.Storage.prototype, "getItem");
    expect(renderToString(<Probe />)).toContain("true");
    expect(getter).not.toHaveBeenCalled();
  });
  it("derives the hydrated value and restores a saved dismissal", () => {
    localStorage.setItem("saved", "1");
    expect(renderHook(() => useLocalStorageBoolean("saved")).result.current[0]).toBe(true);
    expect(renderHook(() => useLocalStorageBoolean("missing")).result.current[0]).toBe(false);
  });
  it("notifies both mounted consumers and removes false values", () => {
    const a = renderHook(() => useLocalStorageBoolean("shared"));
    const b = renderHook(() => useLocalStorageBoolean("shared"));
    act(() => a.result.current[1](true));
    expect(b.result.current[0]).toBe(true);
    expect(localStorage.getItem("shared")).toBe("1");
    act(() => b.result.current[1](false));
    expect(a.result.current[0]).toBe(false);
    expect(localStorage.getItem("shared")).toBeNull();
  });
  it("keeps local and session values isolated for the same key", () => {
    const a = renderHook(() => useLocalStorageBoolean("isolated", true, "1", "local"));
    const b = renderHook(() => useLocalStorageBoolean("isolated", true, "1", "session"));
    act(() => a.result.current[1](true));
    expect(b.result.current[0]).toBe(false);
    act(() => b.result.current[1](true));
    expect(sessionStorage.getItem("isolated")).toBe("1");
  });
  it("switches restaurant keys without leaking a dismissal", () => {
    localStorage.setItem("restaurant-a", "1");
    const hook = renderHook(({ id }) => useLocalStorageBoolean(id), { initialProps: { id: "restaurant-a" } });
    expect(hook.result.current[0]).toBe(true);
    hook.rerender({ id: "restaurant-b" });
    expect(hook.result.current[0]).toBe(false);
  });
  it("responds to cross-tab writes and clear events", () => {
    const hook = renderHook(() => useLocalStorageBoolean("other-tab"));
    act(() => {
      localStorage.setItem("other-tab", "1");
      window.dispatchEvent(new StorageEvent("storage", { key: "other-tab" }));
    });
    expect(hook.result.current[0]).toBe(true);
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(hook.result.current[0]).toBe(false);
  });
  it("retains usable state when reads and writes are denied", () => {
    vi.spyOn(storageWindow.Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Denied"); });
    vi.spyOn(storageWindow.Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Denied"); });
    const hook = renderHook(() => useLocalStorageBoolean("restricted"));
    expect(hook.result.current[0]).toBe(false);
    act(() => hook.result.current[1](true));
    expect(hook.result.current[0]).toBe(true);
  });
  it("retains the preference on quota exhaustion", () => {
    vi.spyOn(storageWindow.Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    const a = renderHook(() => useLocalStorageBoolean("quota"));
    const b = renderHook(() => useLocalStorageBoolean("quota"));
    act(() => a.result.current[1](true));
    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
  });
  it("keeps parsed objects stable between reads", () => {
    const hook = renderHook(() => useLocalStorageState("object", {}, (raw) => raw ? JSON.parse(raw) : {}, JSON.stringify));
    const first = hook.result.current[0];
    hook.rerender();
    expect(hook.result.current[0]).toBe(first);
    act(() => hook.result.current[1]({ visible: true }));
    expect(hook.result.current[0]).toEqual({ visible: true });
  });
  it("uses a false server hydration snapshot and true client snapshot", () => {
    function Probe() { return <span>{String(useClientHydrated())}</span>; }
    expect(renderToString(<Probe />)).toContain("false");
    expect(renderHook(() => useClientHydrated()).result.current).toBe(true);
  });
});

describe("upload count validation", () => {
  const makeFile = (name: string) => Object.assign(new File(["payload"], name, { type: "text/csv" }), { errors: [] as { code: string; message: string }[], preview: "blob:preview" });
  it("marks excess files, then permits the remaining file with File methods intact", () => {
    const rejected = normalizeFileCount([makeFile("a.csv"), makeFile("b.csv")], 1);
    expect(rejected.every((file) => file.errors.some((error) => error.code === "too-many-files"))).toBe(true);
    const [remaining] = normalizeFileCount([rejected[0]], 1);
    expect(remaining.errors).toEqual([]);
    expect(remaining).toBeInstanceOf(File);
    expect(remaining.size).toBe(7);
    expect(remaining.name).toBe("a.csv");
    expect(remaining.preview).toBe("blob:preview");
    expect(remaining.slice(0, 1).size).toBe(1);
    expect(rejected[0].errors).toHaveLength(1);
  });
  it("retains MIME and size errors and does not mutate valid files", () => {
    const file = makeFile("a.csv");
    file.errors.push({ code: "file-too-large", message: "Large" }, { code: "too-many-files", message: "Many" });
    const [next] = normalizeFileCount([file], 1);
    expect(next.errors.map((error) => error.code)).toEqual(["file-too-large"]);
    expect(file.errors).toHaveLength(2);
    const valid = makeFile("valid.csv");
    expect(normalizeFileCount([valid], 1)[0]).toBe(valid);
  });
  it("treats maxFiles zero as unlimited", () => {
    expect(normalizeFileCount([makeFile("a.csv"), makeFile("b.csv")], 0).every((file) => file.errors.length === 0)).toBe(true);
  });
});

describe("POS joined products", () => {
  it("retains to-one object rows", () => {
    const product = { id: "item", name: "Fish", price: 2000 };
    expect(firstJoinedRow(product)).toBe(product);
  });
  it("accepts inferred arrays and missing relations", () => {
    const product = { id: "item" };
    expect(firstJoinedRow([product])).toBe(product);
    expect(firstJoinedRow([])).toBeNull();
    expect(firstJoinedRow(null)).toBeNull();
    expect(firstJoinedRow(undefined)).toBeNull();
  });
});
