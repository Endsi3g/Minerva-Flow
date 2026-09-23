import { roundToCents } from "@/lib/utils";

export type DeliveryPricingConfig = {
  enabled: boolean;
  baseFee: number;
  perKmFee: number;
  freeKm: number;
  maxKm: number;
  averageSpeedKmh: number;
  /** Additional charge per estimated driving minute; zero preserves legacy rates. */
  perMinuteFee: number;
};

export type DeliveryQuote = {
  distanceKm: number | null;
  fee: number;
  etaMinutes: number | null;
  available: boolean;
  reason?: "disabled" | "outside_radius" | "missing_location";
};

export type DeliveryPricingPatch = Partial<Pick<DeliveryPricingConfig,
  "baseFee" | "perKmFee" | "freeKm" | "maxKm" | "averageSpeedKmh" | "perMinuteFee"
>>;

/** Reject malformed owner-entered rates instead of persisting NaN or extreme charges. */
export function isValidDeliveryPricingPatch(patch: DeliveryPricingPatch): boolean {
  const limits: Record<keyof DeliveryPricingPatch, { min: number; max: number }> = {
    baseFee: { min: 0, max: 10_000 },
    perKmFee: { min: 0, max: 10_000 },
    freeKm: { min: 0, max: 1_000 },
    maxKm: { min: 0.1, max: 1_000 },
    averageSpeedKmh: { min: 1, max: 200 },
    perMinuteFee: { min: 0, max: 100 },
  };
  return (Object.entries(patch) as [keyof DeliveryPricingPatch, number][]).every(([key, value]) => {
    const range = limits[key];
    return Number.isFinite(value) && value >= range.min && value <= range.max;
  });
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetweenCoordinatesKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number {
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(origin.lat)) * Math.cos(toRadians(destination.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function quoteDelivery(
  config: DeliveryPricingConfig,
  restaurantLocation: { lat: number | null; lng: number | null },
  customerLocation?: { lat: number | null; lng: number | null } | null
): DeliveryQuote {
  if (!config.enabled) return { distanceKm: null, fee: 0, etaMinutes: null, available: false, reason: "disabled" };
  if (
    restaurantLocation.lat == null ||
    restaurantLocation.lng == null ||
    customerLocation?.lat == null ||
    customerLocation.lng == null
  ) {
    return { distanceKm: null, fee: roundToCents(config.baseFee), etaMinutes: null, available: true, reason: "missing_location" };
  }

  const distanceKm = distanceBetweenCoordinatesKm(
    { lat: restaurantLocation.lat, lng: restaurantLocation.lng },
    { lat: customerLocation.lat, lng: customerLocation.lng }
  );
  if (distanceKm > config.maxKm) {
    return { distanceKm, fee: 0, etaMinutes: null, available: false, reason: "outside_radius" };
  }

  const billableKm = Math.max(0, distanceKm - config.freeKm);
  const travelMinutes = (distanceKm / Math.max(1, config.averageSpeedKmh)) * 60;
  const fee = roundToCents(config.baseFee + billableKm * config.perKmFee + travelMinutes * Math.max(0, config.perMinuteFee));
  const etaMinutes = Math.max(10, Math.round(travelMinutes) + 10);
  return { distanceKm: Math.round(distanceKm * 10) / 10, fee, etaMinutes, available: true };
}
