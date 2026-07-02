import type { City } from "@/lib/types";
import {
  resolveLocationCoordinates,
  type Coordinates,
} from "@/lib/location";

export type SearchLocation = {
  label: string;
  coordinates: Coordinates;
};

type GeocodeResponse = {
  label?: string;
  latitude?: number;
  longitude?: number;
};

export async function geocodeSearchLocation(
  cities: City[],
  locationInput: string,
): Promise<SearchLocation | undefined> {
  const trimmedLocation = locationInput.trim();

  if (!trimmedLocation) {
    return undefined;
  }

  const localLocation = resolveLocationCoordinates(cities, trimmedLocation);

  if (localLocation) {
    return {
      label: trimmedLocation,
      coordinates: localLocation.coordinates,
    };
  }

  const response = await fetch(
    `/api/geocode?q=${encodeURIComponent(trimmedLocation)}`,
  );

  if (!response.ok) {
    return undefined;
  }

  const data = (await response.json()) as GeocodeResponse;

  if (
    typeof data.latitude !== "number" ||
    typeof data.longitude !== "number"
  ) {
    return undefined;
  }

  return {
    label: trimmedLocation || data.label || "Selected location",
    coordinates: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
  };
}
