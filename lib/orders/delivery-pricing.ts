import { roundToCents } from "@/lib/utils";

export type DeliveryPricingConfig = {
  enabled: boolean;
  baseFee: number;
  perKmFee: number;
  freeKm: number;
  maxKm: number;
  averageSpeedKmh: number;
};

export type DeliveryQuote = {
  distanceKm: number | null;
  fee: number;
  etaMinutes: number | null;
  available: boolean;
  reason?: "disabled" | "outside_radius" | "missing_location";
};

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
  const fee = roundToCents(config.baseFee + billableKm * config.perKmFee);
  const etaMinutes = Math.max(10, Math.round((distanceKm / Math.max(1, config.averageSpeedKmh)) * 60) + 10);
  return { distanceKm: Math.round(distanceKm * 10) / 10, fee, etaMinutes, available: true };
}
