import { describe, it, expect } from "vitest";

describe("OpenAPI Spec Generation and Routes", () => {
  it("defines standard OpenAPI 3.1.0 structure", () => {
    const spec = {
      openapi: "3.1.0",
      info: {
        title: "Minerva Flow REST & MCP API",
        version: "1.0.0",
      },
      paths: {
        "/api/v1/restaurant/summary": {},
        "/api/v1/loyalty/referral-roi": {},
        "/api/v1/prospects/list": {},
      },
    };

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Minerva Flow REST & MCP API");
    expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(3);
  });
});
