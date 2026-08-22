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

export const analyticsPlatforms = ["mobile", "server", "web"] as const;

export type KoloAnalyticsEventType = (typeof analyticsEventTypes)[number];
export type KoloAnalyticsContactType = (typeof analyticsContactTypes)[number];
export type KoloAnalyticsPlatform = (typeof analyticsPlatforms)[number];

export type AnalyticsTaxonomyItem = {
  description: string;
  primaryFields: string[];
};

export const analyticsTaxonomy = {
  app_open: {
    description: "A user opens the web app or native app.",
    primaryFields: ["platform", "user_id", "anonymous_id", "session_id"],
  },
  page_view: {
    description: "A web page or mobile tab/screen is viewed.",
    primaryFields: ["platform", "metadata.path", "metadata.screen"],
  },
  signup: {
    description: "A user creates an account.",
    primaryFields: ["platform", "user_id", "metadata.provider"],
  },
  signin: {
    description: "A user signs in to an existing account.",
    primaryFields: ["platform", "user_id", "metadata.provider"],
  },
  search: {
    description: "A user searches or applies city/category filters.",
    primaryFields: [
      "search_query",
      "city",
      "category_slug",
      "metadata.resultCount",
      "metadata.localOnly",
    ],
  },
  search_zero_results: {
    description: "A search returned no businesses or content.",
    primaryFields: [
      "search_query",
      "city",
      "category_slug",
      "metadata.localOnly",
    ],
  },
  business_profile_view: {
    description: "A business profile or business modal is opened.",
    primaryFields: [
      "business_id",
      "business_slug",
      "business_name",
      "city",
      "category_slug",
    ],
  },
  content_view: {
    description: "A service, event, or product detail is opened.",
    primaryFields: ["content_item_id", "content_type", "business_id"],
  },
  contact_click: {
    description: "A user taps a contact action.",
    primaryFields: [
      "contact_type",
      "business_id",
      "content_item_id",
      "content_type",
    ],
  },
  save_business: {
    description: "A signed-in user saves a business.",
    primaryFields: ["user_id", "business_id", "business_slug"],
  },
  unsave_business: {
    description: "A signed-in user removes a saved business.",
    primaryFields: ["user_id", "business_id", "business_slug"],
  },
  share: {
    description: "A user opens native/share UI for a business or content item.",
    primaryFields: [
      "business_id",
      "content_item_id",
      "content_type",
      "metadata.shareTarget",
    ],
  },
  business_submit: {
    description: "A business is submitted for review.",
    primaryFields: ["user_id", "category_slug", "city"],
  },
  business_update: {
    description: "A business owner or admin updates business profile details.",
    primaryFields: ["user_id", "business_id", "business_slug"],
  },
  content_create: {
    description: "A business owner creates a service, event, or product.",
    primaryFields: ["user_id", "business_id", "content_item_id", "content_type"],
  },
  content_update: {
    description: "A business owner updates a service, event, or product.",
    primaryFields: ["user_id", "business_id", "content_item_id", "content_type"],
  },
  content_delete: {
    description: "A business owner deletes a service, event, or product.",
    primaryFields: ["user_id", "business_id", "content_item_id", "content_type"],
  },
  notification_view: {
    description: "A logged-in user sees an in-app notification.",
    primaryFields: ["user_id", "metadata.notificationId"],
  },
  notification_dismiss: {
    description: "A logged-in user dismisses an in-app notification.",
    primaryFields: ["user_id", "metadata.notificationId"],
  },
} satisfies Record<KoloAnalyticsEventType, AnalyticsTaxonomyItem>;

export function isKoloAnalyticsEventType(
  value: string,
): value is KoloAnalyticsEventType {
  return analyticsEventTypes.includes(value as KoloAnalyticsEventType);
}
