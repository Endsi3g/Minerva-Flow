import { describe, it, expect } from "vitest";
import {
  Google,
  GoogleWorkspace,
  Gmail,
  GoogleCalendar,
  GoogleSheets,
  GoogleDrive,
  GoogleAnalytics,
  GoogleAds,
  QuickBooks,
  Xero,
  Sage,
  FreshBooks,
  Dext,
  Pennylane,
} from "@/components/ui/BrandIcons";

describe("Integrations Ecosystem Brand Icons", () => {
  it("exports all Google Workspace brand icons", () => {
    expect(Google).toBeDefined();
    expect(GoogleWorkspace).toBeDefined();
    expect(Gmail).toBeDefined();
    expect(GoogleCalendar).toBeDefined();
    expect(GoogleSheets).toBeDefined();
    expect(GoogleDrive).toBeDefined();
    expect(GoogleAnalytics).toBeDefined();
    expect(GoogleAds).toBeDefined();
  });

  it("exports all Accounting & Invoicing brand icons", () => {
    expect(QuickBooks).toBeDefined();
    expect(Xero).toBeDefined();
    expect(Sage).toBeDefined();
    expect(FreshBooks).toBeDefined();
    expect(Dext).toBeDefined();
    expect(Pennylane).toBeDefined();
  });
});
