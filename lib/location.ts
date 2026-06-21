import type { City } from "@/lib/types";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

type KnownLocation = {
  label: string;
  names: string[];
  coordinates: Coordinates;
};

export type LocationResolution = {
  city: City;
  kind: "city" | "nearby";
};

export type LocationSuggestion = {
  id: string;
  label: string;
  city: City;
  kind: "city" | "nearby";
  coordinates: Coordinates;
  distanceInKm: number;
};

export type LocationCoordinates = {
  label: string;
  city?: City;
  coordinates: Coordinates;
};

const knownLocations: KnownLocation[] = [
  {
    label: "Stittsville",
    names: ["stittsville", "kanata", "barrhaven", "nepean"],
    coordinates: { latitude: 45.2573, longitude: -75.9153 },
  },
  {
    label: "Kingston",
    names: ["kingston"],
    coordinates: { latitude: 44.2312, longitude: -76.486 },
  },
  {
    label: "Mississauga",
    names: ["mississauga", "brampton", "oakville", "gta"],
    coordinates: { latitude: 43.589, longitude: -79.6441 },
  },
  {
    label: "North York",
    names: ["scarborough", "north york", "etobicoke", "markham", "vaughan"],
    coordinates: { latitude: 43.7615, longitude: -79.4111 },
  },
  {
    label: "Hamilton",
    names: ["hamilton", "burlington"],
    coordinates: { latitude: 43.2557, longitude: -79.8711 },
  },
  {
    label: "Kitchener-Waterloo",
    names: ["kitchener", "waterloo", "cambridge"],
    coordinates: { latitude: 43.4516, longitude: -80.4925 },
  },
  {
    label: "London",
    names: ["london", "windsor"],
    coordinates: { latitude: 42.9849, longitude: -81.2453 },
  },
  {
    label: "Laval",
    names: ["laval", "longueuil", "brossard", "mtl"],
    coordinates: { latitude: 45.6066, longitude: -73.7124 },
  },
  {
    label: "Quebec City",
    names: ["quebec", "quebec city"],
    coordinates: { latitude: 46.8139, longitude: -71.208 },
  },
  {
    label: "Burnaby",
    names: ["burnaby", "surrey", "richmond", "victoria"],
    coordinates: { latitude: 49.2827, longitude: -123.1207 },
  },
  {
    label: "Red Deer",
    names: ["red deer", "airdrie"],
    coordinates: { latitude: 51.0447, longitude: -114.0719 },
  },
  {
    label: "St. Albert",
    names: ["st albert", "sherwood park"],
    coordinates: { latitude: 53.5461, longitude: -113.4938 },
  },
  {
    label: "Saskatoon",
    names: ["saskatoon", "regina"],
    coordinates: { latitude: 52.1579, longitude: -106.6702 },
  },
  {
    label: "Winnipeg",
    names: ["winnipeg"],
    coordinates: { latitude: 49.8951, longitude: -97.1384 },
  },
  {
    label: "Halifax",
    names: ["dartmouth", "halifax"],
    coordinates: { latitude: 44.6488, longitude: -63.5752 },
  },
];

export const manualLocationSuggestions = [
  "Stittsville",
  "Kanata",
  "Barrhaven",
  "Nepean",
  "Kingston",
  "Mississauga",
  "Brampton",
  "North York",
  "Hamilton",
  "Kitchener",
  "London",
  "Laval",
  "Victoria",
  "Burnaby",
  "Surrey",
  "Saskatoon",
  "Regina",
  "Dartmouth",
  "Quebec City",
  "Winnipeg",
  "Calgary",
  "Edmonton",
  "Vancouver",
  "Halifax",
];

export function normalizeLocationInput(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґё]+/giu, " ")
    .trim();
}

function getDirectCityNames(city: City) {
  return [
    city.slug,
    city.name,
    `${city.name} ${city.province}`,
    `${city.name}, ${city.province}`,
  ];
}

function matchesName(input: string, name: string) {
  const normalizedName = normalizeLocationInput(name);

  return (
    input === normalizedName ||
    (input.length >= 3 &&
      (input.includes(normalizedName) || normalizedName.includes(input)))
  );
}

export function getNearestCity(cities: City[], coordinates: Coordinates) {
  return cities.reduce<City | undefined>((nearestCity, city) => {
    if (!nearestCity) {
      return city;
    }

    const nearestDistance = getDistanceInKm(
      coordinates,
      nearestCity.coordinates,
    );
    const cityDistance = getDistanceInKm(coordinates, city.coordinates);

    return cityDistance < nearestDistance ? city : nearestCity;
  }, undefined);
}

export function resolveCityFromLocationInput(
  cities: City[],
  locationInput: string,
): LocationResolution | undefined {
  const normalizedInput = normalizeLocationInput(locationInput);

  if (!normalizedInput) {
    return undefined;
  }

  const directCity = cities.find((city) =>
    getDirectCityNames(city).some((name) => matchesName(normalizedInput, name)),
  );

  if (directCity) {
    return { city: directCity, kind: "city" };
  }

  const knownLocation = knownLocations.find((location) =>
    location.names.some((name) => matchesName(normalizedInput, name)),
  );

  if (!knownLocation) {
    return undefined;
  }

  const nearestCity = getNearestCity(cities, knownLocation.coordinates);

  return nearestCity ? { city: nearestCity, kind: "nearby" } : undefined;
}

export function resolveLocationCoordinates(
  cities: City[],
  locationInput: string,
): LocationCoordinates | undefined {
  const normalizedInput = normalizeLocationInput(locationInput);

  if (!normalizedInput) {
    return undefined;
  }

  const directCity = cities.find((city) =>
    getDirectCityNames(city).some((name) => matchesName(normalizedInput, name)),
  );

  if (directCity) {
    return {
      label: directCity.name,
      city: directCity,
      coordinates: directCity.coordinates,
    };
  }

  const knownLocation = knownLocations.find((location) =>
    location.names.some((name) => matchesName(normalizedInput, name)),
  );

  if (!knownLocation) {
    return undefined;
  }

  return {
    label: knownLocation.label,
    city: getNearestCity(cities, knownLocation.coordinates),
    coordinates: knownLocation.coordinates,
  };
}

export function getLocationSuggestions(
  cities: City[],
  locationInput: string,
  limit = 6,
): LocationSuggestion[] {
  const normalizedInput = normalizeLocationInput(locationInput);
  const suggestions: LocationSuggestion[] = [];

  cities.forEach((city) => {
    const matchesInput =
      !normalizedInput ||
      getDirectCityNames(city).some((name) => matchesName(normalizedInput, name));

    if (matchesInput) {
      suggestions.push({
        id: `city-${city.slug}`,
        label: city.name,
        city,
        kind: "city",
        coordinates: city.coordinates,
        distanceInKm: 0,
      });
    }
  });

  knownLocations.forEach((location) => {
    const matchesInput =
      !normalizedInput ||
      location.names.some((name) => matchesName(normalizedInput, name)) ||
      matchesName(normalizedInput, location.label);

    if (!matchesInput) {
      return;
    }

    const nearestCity = getNearestCity(cities, location.coordinates);

    if (!nearestCity) {
      return;
    }

    suggestions.push({
      id: `nearby-${normalizeLocationInput(location.label).replace(/\s+/g, "-")}`,
      label: location.label,
      city: nearestCity,
      kind: "nearby",
      coordinates: location.coordinates,
      distanceInKm: Math.round(
        getDistanceInKm(location.coordinates, nearestCity.coordinates),
      ),
    });
  });

  return suggestions
    .sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "city" ? -1 : 1;
      }

      return a.distanceInKm - b.distanceInKm;
    })
    .slice(0, limit);
}

export function getDistanceInKm(from: Coordinates, to: Coordinates) {
  const radiusInKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return radiusInKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
