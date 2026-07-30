"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AnalyticsContactType,
  AnalyticsEventType,
  Database,
  Json,
} from "@/lib/supabase/database.types";

type AnalyticsEventInsert =
  Database["public"]["Tables"]["analytics_events"]["Insert"];

type TrackAnalyticsEventInput = Omit<
  AnalyticsEventInsert,
  "anonymous_id" | "metadata" | "platform" | "session_id" | "user_id"
> & {
  metadata?: Record<string, Json | undefined>;
};

const anonymousIdKey = "kolo-anonymous-id";
const sessionIdKey = "kolo-analytics-session-id";

export type ContactAnalyticsTarget = {
  businessId?: string;
  businessName?: string;
  businessSlug?: string;
  contactType: AnalyticsContactType;
  contentItemId?: string;
  contentType?: AnalyticsEventInsert["content_type"];
};

export async function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    return;
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const metadata = removeUndefinedValues(input.metadata ?? {});

    await supabase.from("analytics_events").insert({
      ...input,
      anonymous_id: getOrCreateStoredId(anonymousIdKey, "anon"),
      metadata,
      platform: "web",
      session_id: getOrCreateStoredId(sessionIdKey, "session"),
      user_id: user?.id ?? null,
    });
  } catch (error) {
    console.error("[kolo:web-analytics]", error);
  }
}

export function trackContactClick(target: ContactAnalyticsTarget) {
  void trackAnalyticsEvent({
    business_id: target.businessId,
    business_name: target.businessName,
    business_slug: target.businessSlug,
    contact_type: target.contactType,
    content_item_id: target.contentItemId,
    content_type: target.contentType,
    event_type: "contact_click",
  });
}

export function isAnalyticsEventType(value: string): value is AnalyticsEventType {
  return [
    "app_open",
    "business_profile_view",
    "contact_click",
    "content_view",
    "page_view",
    "search",
    "share",
    "signup",
  ].includes(value);
}

function getOrCreateStoredId(key: string, prefix: string) {
  const existingValue = window.localStorage.getItem(key);

  if (existingValue) {
    return existingValue;
  }

  const nextValue = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  window.localStorage.setItem(key, nextValue);

  return nextValue;
}

function removeUndefinedValues(values: Record<string, Json | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Record<string, Json>;
}
