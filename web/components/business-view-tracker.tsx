"use client";

import { useEffect } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";

type BusinessViewTrackerProps = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  categorySlug: string;
  city: string;
  metadata?: Record<string, string | number>;
};

export function BusinessViewTracker({
  businessId,
  businessName,
  businessSlug,
  categorySlug,
  city,
  metadata,
}: BusinessViewTrackerProps) {
  useEffect(() => {
    void trackAnalyticsEvent({
      business_id: businessId,
      business_name: businessName,
      business_slug: businessSlug,
      category_slug: categorySlug,
      city,
      event_type: "business_profile_view",
      metadata,
    });
  }, [businessId, businessName, businessSlug, categorySlug, city, metadata]);

  return null;
}
