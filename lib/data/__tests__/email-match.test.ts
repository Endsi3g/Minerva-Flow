import { describe, expect, it } from "vitest";
import { emailMatchOperator } from "../email-match";

describe("emailMatchOperator", () => {
  it("allows case-insensitive matching for ordinary normalized emails", () => {
    expect(emailMatchOperator("guest+orders@example.com")).toBe("ilike");
  });

  it.each(["%", "_", "*", "\\"])("uses exact matching for LIKE metacharacter %s", (character) => {
    expect(emailMatchOperator(`guest${character}@example.com`)).toBe("eq");
  });
});
