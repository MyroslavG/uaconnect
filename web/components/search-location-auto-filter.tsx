"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { copy, type Locale } from "@/lib/i18n";
import type { City } from "@/lib/types";

type SearchLocationAutoFilterProps = {
  categories?: string;
  cities: City[];
  enabled: boolean;
  locale: Locale;
  localOnly?: boolean;
  preferLocalOnly?: boolean;
  query?: string;
  radius?: string;
};

const sessionKey = "kolo:auto-location-search";

export function SearchLocationAutoFilter({
  categories,
  cities,
  enabled,
  locale,
  localOnly = false,
  preferLocalOnly = false,
  query,
  radius,
}: SearchLocationAutoFilterProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const fallbackParams = getBaseParams({
      categories,
      localOnly,
      query,
      radius,
    });
    fallbackParams.set("locationReady", "1");
    const fallbackPath = `/search?${fallbackParams.toString()}`;

    if (!navigator.geolocation) {
      router.replace(fallbackPath);
      return;
    }

    if (window.sessionStorage.getItem(sessionKey) === "1") {
      router.replace(fallbackPath);
      return;
    }

    window.sessionStorage.setItem(sessionKey, "1");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearestCity = getNearestCityName(cities, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        const params = getBaseParams({
          categories,
          localOnly: localOnly || preferLocalOnly,
          query,
          radius,
        });

        params.set(
          "near",
          nearestCity ?? copy[locale].search.currentLocation,
        );
        params.set("lat", position.coords.latitude.toFixed(6));
        params.set("lng", position.coords.longitude.toFixed(6));

        router.replace(`/search?${params.toString()}`);
      },
      () => {
        window.sessionStorage.setItem(sessionKey, "1");
        router.replace(fallbackPath);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, [
    categories,
    cities,
    enabled,
    localOnly,
    locale,
    preferLocalOnly,
    query,
    radius,
    router,
  ]);

  return null;
}

function getBaseParams({
  categories,
  localOnly,
  query,
  radius,
}: {
  categories?: string;
  localOnly: boolean;
  query?: string;
  radius?: string;
}) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  if (categories) {
    params.set("category", categories);
  }

  if (radius) {
    params.set("radius", radius);
  }

  if (localOnly) {
    params.set("localOnly", "1");
  }

  return params;
}

function getNearestCityName(
  cities: City[],
  coordinates: { latitude: number; longitude: number },
) {
  let nearestCity: City | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const city of cities) {
    const distance = getDistanceInKm(coordinates, city.coordinates);

    if (distance < nearestDistance) {
      nearestCity = city;
      nearestDistance = distance;
    }
  }

  return nearestCity?.name;
}

function getDistanceInKm(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const earthRadiusInKm = 6371;
  const latitudeDistance = toRadians(second.latitude - first.latitude);
  const longitudeDistance = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
    Math.sin(longitudeDistance / 2) *
      Math.sin(longitudeDistance / 2) *
      Math.cos(firstLatitude) *
      Math.cos(secondLatitude);

  return (
    earthRadiusInKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
