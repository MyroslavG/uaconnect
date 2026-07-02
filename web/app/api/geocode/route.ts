import { NextResponse } from "next/server";

import { cities } from "@/lib/data";
import { resolveLocationCoordinates } from "@/lib/location";

type NominatimPlace = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const localLocation = resolveLocationCoordinates(cities, query);

  if (localLocation) {
    return NextResponse.json({
      label: localLocation.label,
      latitude: localLocation.coordinates.latitude,
      longitude: localLocation.coordinates.longitude,
      source: "local",
    });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ca");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en-CA,uk;q=0.9,en;q=0.8",
        "User-Agent": "UAConnect/1.0",
      },
      next: {
        revalidate: 60 * 60 * 24 * 30,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not geocode location" },
        { status: 502 },
      );
    }

    const places = (await response.json()) as NominatimPlace[];
    const place = places[0];
    const latitude = Number(place?.lat);
    const longitude = Number(place?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      label: place.display_name ?? query,
      latitude,
      longitude,
      source: "nominatim",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not geocode location" },
      { status: 502 },
    );
  }
}
