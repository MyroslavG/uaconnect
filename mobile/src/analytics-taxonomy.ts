export const analyticsEventTypes = [
  "app_open",
  "page_view",
  "signup",
  "signin",
  "search",
  "search_zero_results",
  "business_profile_view",
  "content_view",
  "contact_click",
  "save_business",
  "unsave_business",
  "share",
  "business_submit",
  "business_update",
  "content_create",
  "content_update",
  "content_delete",
  "notification_view",
  "notification_dismiss",
] as const;

export const analyticsContactTypes = [
  "address",
  "instagram",
  "link",
  "phone",
  "route",
  "website",
] as const;

export type AnalyticsEventType = (typeof analyticsEventTypes)[number];
export type AnalyticsContactType = (typeof analyticsContactTypes)[number];
