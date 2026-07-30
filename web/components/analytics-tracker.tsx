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
    if (!hasTrackedOpen.current) {
      hasTrackedOpen.current = true;
      void trackAnalyticsEvent({
        event_type: "app_open",
        metadata: {
          path: pathname,
          source: "web",
        },
      });
    }

    void trackAnalyticsEvent({
      event_type: "page_view",
      metadata: {
        path: pathname,
        search: searchParamsString,
      },
    });

    if (pathname === "/search") {
      const query = searchParams.get("q")?.trim() ?? "";
      const city = searchParams.get("city") ?? searchParams.get("near") ?? "";
      const category = searchParams.get("category") ?? "";
      const localOnly = searchParams.get("localOnly") === "1";
      const radius = searchParams.get("radius") ?? "";

      void trackAnalyticsEvent({
        category_slug: category || null,
        city: city || null,
        event_type: "search",
        metadata: {
          localOnly,
          radius,
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
          localOnly: searchParams.get("localOnly") === "1",
          source: "city_category_route",
        },
        search_query: searchParams.get("q")?.trim() || null,
      });
    }
  }, [pathname, searchParams, searchParamsString]);

  return null;
}
