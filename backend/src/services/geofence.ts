import type { LocationData } from "../types.js";

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceInMeters(from: LocationData, to: LocationData): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function isLocationReliable(
  accuracyMeters: number,
  maximumAccuracyMeters = 50,
): boolean {
  return Number.isFinite(accuracyMeters) && accuracyMeters <= maximumAccuracyMeters;
}

export function isInsideGeofence(
  distanceMeters: number,
  accuracyMeters: number,
  radiusMeters = 150,
): boolean {
  return isLocationReliable(accuracyMeters) && distanceMeters <= radiusMeters;
}
