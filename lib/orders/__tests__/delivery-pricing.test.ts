import { describe, expect, it } from "vitest";
import { distanceBetweenCoordinatesKm, quoteDelivery } from "../delivery-pricing";

const config = { enabled: true, baseFee: 3.99, perKmFee: 1.25, freeKm: 2, maxKm: 10, averageSpeedKmh: 25 };

describe("delivery pricing", () => {
  it("calculates a stable coordinate distance", () => {
    expect(distanceBetweenCoordinatesKm({ lat: 45.5017, lng: -73.5673 }, { lat: 45.5088, lng: -73.5878 })).toBeGreaterThan(1);
  });

  it("charges the base fee inside the free radius", () => {
    const quote = quoteDelivery(config, { lat: 45.5017, lng: -73.5673 }, { lat: 45.503, lng: -73.57 });
    expect(quote.available).toBe(true);
    expect(quote.fee).toBe(3.99);
    expect(quote.etaMinutes).toBeGreaterThan(0);
  });

  it("rejects a destination outside the configured radius", () => {
    const quote = quoteDelivery(config, { lat: 45.5017, lng: -73.5673 }, { lat: 45.9, lng: -73.1 });
    expect(quote.available).toBe(false);
    expect(quote.reason).toBe("outside_radius");
  });
});
