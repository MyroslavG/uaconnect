"use client";

import { useEffect } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";

type BusinessViewTrackerProps = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  categorySlug: string;
  city: string;
};

export function BusinessViewTracker({
  businessId,
  businessName,
  businessSlug,
  categorySlug,
  city,
}: BusinessViewTrackerProps) {
  useEffect(() => {
    void trackAnalyticsEvent({
      business_id: businessId,
      business_name: businessName,
      business_slug: businessSlug,
      category_slug: categorySlug,
      city,
      event_type: "business_profile_view",
    });
  }, [businessId, businessName, businessSlug, categorySlug, city]);

  return null;
}
