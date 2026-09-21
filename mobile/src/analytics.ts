import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  AnalyticsContactType,
  AnalyticsEventType,
} from "./analytics-taxonomy";
import {
  ANALYTICS_ALL_CATEGORY,
  ANALYTICS_ALL_LOCATION,
  normalizeAnalyticsCategorySlug,
  normalizeAnalyticsCity,
} from "./analytics-normalization";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { Business, BusinessContentItem } from "./types";

type TrackMobileAnalyticsEventInput = {
  business?: Business;
  businessId?: string;
  businessName?: string;
  businessSlug?: string;
  categorySlug?: string;
  city?: string;
  contactType?: AnalyticsContactType;
  contentItem?: BusinessContentItem;
  eventType: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  searchQuery?: string;
  userId?: string;
};

const anonymousIdKey = "kolo-anonymous-id";
const sessionIdKey = "kolo-analytics-session-id";

export async function trackMobileAnalyticsEvent({
  business,
  businessId,
  businessName,
  businessSlug,
  categorySlug,
  city,
  contactType,
  contentItem,
  eventType,
  metadata,
  searchQuery,
  userId,
}: TrackMobileAnalyticsEventInput) {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const rawCategorySlug = categorySlug ?? business?.categorySlug ?? null;
    const rawCity = city ?? business?.city ?? null;
    const normalizedCategorySlug = normalizeAnalyticsCategorySlug(
      rawCategorySlug,
      eventType === "search" ? ANALYTICS_ALL_CATEGORY : null,
    );
    const normalizedCity = normalizeAnalyticsCity(
      rawCity,
      eventType === "search" ? ANALYTICS_ALL_LOCATION : null,
    );

    await supabase.from("analytics_events").insert({
      anonymous_id: await getOrCreateStoredId(anonymousIdKey, "anon"),
      business_id: businessId ?? business?.id ?? null,
      business_name: businessName ?? business?.name ?? null,
      business_slug: businessSlug ?? business?.slug ?? null,
      category_slug: normalizedCategorySlug,
      city: normalizedCity,
      contact_type: contactType ?? null,
      content_item_id: contentItem?.id ?? null,
      content_type: contentItem?.type ?? null,
      event_type: eventType,
      metadata: removeUndefinedValues(metadata ?? {}),
      platform: "mobile",
      search_query: searchQuery ?? null,
      session_id: await getOrCreateStoredId(sessionIdKey, "session"),
      user_id: userId ?? null,
    });
  } catch (error) {
    console.error("[kolo:mobile-analytics]", error);
  }
}

async function getOrCreateStoredId(key: string, prefix: string) {
  const existingValue = await AsyncStorage.getItem(key);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  await AsyncStorage.setItem(key, nextValue);

  return nextValue;
}

function removeUndefinedValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}
