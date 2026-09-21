"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedOpen = useRef(false);
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const acquisitionMetadata = getAcquisitionMetadata({
      pathname,
      searchParams,
      searchParamsString,
    });

    if (!hasTrackedOpen.current) {
      hasTrackedOpen.current = true;
      void trackAnalyticsEvent({
        event_type: "app_open",
        metadata: {
          ...acquisitionMetadata,
          source: "web",
        },
      });
    }

    void trackAnalyticsEvent({
      event_type: "page_view",
      metadata: {
        ...acquisitionMetadata,
        source: "web",
      },
    });

    if (pathname === "/search") {
      const query = searchParams.get("q")?.trim() ?? "";
      const city = searchParams.get("city") ?? searchParams.get("near") ?? null;
      const category = searchParams.get("category") ?? null;
      const localOnly = searchParams.get("localOnly") === "1";
      const radius = searchParams.get("radius") ?? "";

      void trackAnalyticsEvent({
        category_slug: category,
        city,
        event_type: "search",
        metadata: {
          ...acquisitionMetadata,
          localOnly,
          radius,
          source: "web_search",
        },
        search_query: query || null,
      });
    }

    const pathSegments = pathname.split("/").filter(Boolean);

    if (
      pathSegments.length === 2 &&
      ![
        "admin",
        "api",
        "auth",
        "business",
        "claim",
        "dashboard",
        "notifications",
        "privacy",
        "register",
        "search",
        "support",
      ].includes(pathSegments[0] ?? "")
    ) {
      void trackAnalyticsEvent({
        category_slug: pathSegments[1],
        city: pathSegments[0],
        event_type: "search",
        metadata: {
          ...acquisitionMetadata,
          localOnly: searchParams.get("localOnly") === "1",
          source: "city_category_route",
        },
        search_query: searchParams.get("q")?.trim() || null,
      });
    }
  }, [pathname, searchParams, searchParamsString]);

  return null;
}

function getAcquisitionMetadata({
  pathname,
  searchParams,
  searchParamsString,
}: {
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  searchParamsString: string;
}) {
  const fullPath = `${pathname}${
    searchParamsString ? `?${searchParamsString}` : ""
  }`;

  return {
    landingPath: fullPath,
    path: pathname,
    referrer: document.referrer || undefined,
    search: searchParamsString || undefined,
    utmCampaign: searchParams.get("utm_campaign") ?? undefined,
    utmContent: searchParams.get("utm_content") ?? undefined,
    utmMedium: searchParams.get("utm_medium") ?? undefined,
    utmSource: searchParams.get("utm_source") ?? undefined,
    utmTerm: searchParams.get("utm_term") ?? undefined,
  };
}
