import { describe, expect, it } from "vitest";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flatten(value as Record<string, unknown>, path));
    } else {
      acc[path] = value;
    }
    return acc;
  }, {});
}

const frFlat = flatten(fr);
const enFlat = flatten(en);
const variables = (value: unknown) =>
  typeof value === "string" ? [...value.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1]).sort().join(",") : "";

describe("French and English message catalogs", () => {
  it("English has every key French has", () => {
    const missing = Object.keys(frFlat).filter((key) => !(key in enFlat));
    expect(missing).toEqual([]);
  });

  it("placeholders match between languages", () => {
    const mismatched = Object.keys(frFlat).filter(
      (key) => key in enFlat && variables(frFlat[key]) !== variables(enFlat[key]),
    );
    expect(mismatched).toEqual([]);
  });
});
