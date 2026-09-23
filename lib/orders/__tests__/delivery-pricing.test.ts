import { describe, expect, it } from "vitest";
import { distanceBetweenCoordinatesKm, isValidDeliveryPricingPatch, quoteDelivery } from "../delivery-pricing";

const config = { enabled: true, baseFee: 3.99, perKmFee: 1.25, freeKm: 2, maxKm: 10, averageSpeedKmh: 25, perMinuteFee: 0 };

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

  it("adds a configurable fee for estimated driving time without changing the ETA formula", () => {
    const origin = { lat: 45.5017, lng: -73.5673 };
    const destination = { lat: 45.535, lng: -73.57 };
    const distanceKm = distanceBetweenCoordinatesKm(origin, destination);
    const perMinuteFee = 0.4;
    const quote = quoteDelivery({ ...config, perKmFee: 0, freeKm: 0, perMinuteFee }, origin, destination);
    const expected = Math.round((config.baseFee + ((distanceKm / config.averageSpeedKmh) * 60 * perMinuteFee)) * 100) / 100;
    expect(quote.available).toBe(true);
    expect(quote.fee).toBe(expected);
    expect(quote.etaMinutes).toBe(Math.max(10, Math.round((distanceKm / config.averageSpeedKmh) * 60) + 10));
  });

  it("rejects non-finite and out-of-range owner rates while allowing the zero-per-minute default", () => {
    expect(isValidDeliveryPricingPatch({ perMinuteFee: 0 })).toBe(true);
    expect(isValidDeliveryPricingPatch({ perMinuteFee: Number.NaN })).toBe(false);
    expect(isValidDeliveryPricingPatch({ perMinuteFee: 100.01 })).toBe(false);
    expect(isValidDeliveryPricingPatch({ maxKm: 0 })).toBe(false);
    expect(isValidDeliveryPricingPatch({ averageSpeedKmh: 0 })).toBe(false);
  });
});
