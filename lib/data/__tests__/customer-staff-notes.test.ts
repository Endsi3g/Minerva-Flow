import { describe, expect, it } from "vitest";
import { sanitizeStaffNote, STAFF_NOTE_MAX_LENGTH } from "../customer-staff-notes";

describe("sanitizeStaffNote", () => {
  it("unifies line breaks and trims", () => {
    expect(sanitizeStaffNote("  Allergie : noix\r\nTable 4\r  ")).toBe("Allergie : noix\nTable 4");
  });
  it("returns an empty string for blank input so the note is deleted", () => {
    expect(sanitizeStaffNote("  \n \r\n ")).toBe("");
  });
  it("caps the length at the database limit", () => {
    expect(sanitizeStaffNote("a".repeat(STAFF_NOTE_MAX_LENGTH + 50))).toHaveLength(STAFF_NOTE_MAX_LENGTH);
  });
});
