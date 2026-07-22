import type { Locale } from "@/lib/i18n";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type NotificationRow = Database["public"]["Tables"]["app_notifications"]["Row"];

export type Announcement = {
  id: string;
  badge: Record<Locale, string>;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  href?: string;
  cta?: Record<Locale, string>;
  publishedAt: string;
};

const notificationSelect =
  "id, badge_uk, badge_en, title_uk, title_en, body_uk, body_en, href, cta_uk, cta_en, status, created_by, published_at, created_at, updated_at";

export async function getVisibleAnnouncements(
  userId: string | null | undefined,
): Promise<Announcement[]> {
  if (!userId) {
    return [];
  }

  const supabase = await createClient();
  const { data: notificationRows, error: notificationsError } = await supabase
    .from("app_notifications")
    .select(notificationSelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (notificationsError) {
    if (!isNotificationSchemaError(notificationsError)) {
      console.error("[kolo:web-notifications] Fetch failed", {
        code: notificationsError.code,
        message: notificationsError.message,
        details: notificationsError.details,
      });
    }

    return [];
  }

  if (!notificationRows?.length) {
    return [];
  }

  const { data: dismissalRows, error: dismissalsError } = await supabase
    .from("notification_dismissals")
    .select("notification_id")
    .eq("user_id", userId);

  if (dismissalsError) {
    if (!isNotificationSchemaError(dismissalsError)) {
      console.error("[kolo:web-notifications] Dismissal fetch failed", {
        code: dismissalsError.code,
        message: dismissalsError.message,
        details: dismissalsError.details,
      });
    }

    return notificationRows.map(mapNotificationToAnnouncement);
  }

  const dismissedIds = new Set(
    (dismissalRows ?? []).map((row) => row.notification_id),
  );

  return notificationRows
    .filter((notification) => !dismissedIds.has(notification.id))
    .map(mapNotificationToAnnouncement);
}

export function mapNotificationToAnnouncement(
  notification: NotificationRow,
): Announcement {
  const href = optionalText(notification.href);
  const ctaUk = optionalText(notification.cta_uk);
  const ctaEn = optionalText(notification.cta_en);

  return {
    id: notification.id,
    badge: {
      uk: notification.badge_uk,
      en: notification.badge_en,
    },
    title: {
      uk: notification.title_uk,
      en: notification.title_en,
    },
    body: {
      uk: notification.body_uk,
      en: notification.body_en,
    },
    href,
    cta:
      href && (ctaUk || ctaEn)
        ? {
            uk: ctaUk ?? ctaEn ?? "",
            en: ctaEn ?? ctaUk ?? "",
          }
        : undefined,
    publishedAt: notification.published_at,
  };
}

export function isNotificationSchemaError(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "PGRST200" ||
    error.code === "PGRST205" ||
    message.includes("app_notifications") ||
    message.includes("notification_dismissals") ||
    message.includes("schema cache")
  );
}

function optionalText(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}
