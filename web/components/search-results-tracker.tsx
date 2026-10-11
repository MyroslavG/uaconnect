"use client";

import { useEffect, useRef } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";

type SearchResultsTrackerProps = {
  categorySlug?: string;
  city?: string;
  enabled: boolean;
  localOnly: boolean;
  query?: string;
  radiusInKm?: number;
  resultCount: number;
  source: "city_category_route" | "web_search";
};

export function SearchResultsTracker({
  categorySlug,
  city,
  enabled,
  localOnly,
  query,
  radiusInKm,
  resultCount,
  source,
}: SearchResultsTrackerProps) {
  const lastTrackedKey = useRef<string | null>(null);
  const normalizedQuery = query?.trim() ?? "";
  const trackingKey = JSON.stringify({
    categorySlug: categorySlug ?? "all",
    city: city ?? "all-canada",
    localOnly,
    normalizedQuery,
    radiusInKm: radiusInKm ?? null,
    resultCount,
    source,
  });

  useEffect(() => {
    if (!enabled || lastTrackedKey.current === trackingKey) {
      return;
    }

    lastTrackedKey.current = trackingKey;
    const hasKeyword = Boolean(normalizedQuery);
    const hasCategory = Boolean(categorySlug && categorySlug !== "all");
    const hasLocation = Boolean(city && city !== "all-canada");

    void trackAnalyticsEvent({
      category_slug: categorySlug,
      city,
      event_type: "search",
      metadata: {
        hasCategory,
        hasKeyword,
        hasLocation,
        localOnly,
        radiusInKm,
        resultCount,
        source,
      },
      search_query: normalizedQuery || null,
    });
  }, [
    categorySlug,
    city,
    enabled,
    localOnly,
    normalizedQuery,
    radiusInKm,
    resultCount,
    source,
    trackingKey,
  ]);

  return null;
}
