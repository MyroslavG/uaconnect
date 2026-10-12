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

    const metadata = {
      hasCategory,
      hasKeyword,
      hasLocation,
      localOnly,
      radiusInKm,
      resultCount,
      source,
    };

    void trackAnalyticsEvent({
      category_slug: categorySlug,
      city,
      event_type: "search",
      metadata,
      search_query: normalizedQuery || null,
    });

    if (resultCount === 0) {
      void trackAnalyticsEvent({
        category_slug: categorySlug,
        city,
        event_type: "search_zero_results",
        metadata,
        search_query: normalizedQuery || null,
      });
    }
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
