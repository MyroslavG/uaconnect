import { isSupabaseConfigured, supabase } from "./supabase";
import type { Locale } from "./types";

export type AppAnnouncement = {
  id: string;
  badge: Record<Locale, string>;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
};

type NotificationRow = {
  id: string;
  badge_uk: string;
  badge_en: string;
  title_uk: string;
  title_en: string;
  body_uk: string;
  body_en: string;
  published_at: string;
};

type DismissalRow = {
  notification_id: string;
};

const notificationSelect =
  "id, badge_uk, badge_en, title_uk, title_en, body_uk, body_en, published_at";

export async function fetchVisibleAnnouncements(userId: string) {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const { data: notificationData, error: notificationError } = await supabase
    .from("app_notifications")
    .select(notificationSelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (notificationError) {
    if (!isNotificationSchemaError(notificationError)) {
      console.error("[kolo:mobile-notifications] Fetch failed", {
        code: notificationError.code,
        message: notificationError.message,
        details: notificationError.details,
      });
    }

    return [];
  }

  const notificationRows = (notificationData ?? []) as NotificationRow[];

  if (notificationRows.length === 0) {
    return [];
  }

  const { data: dismissalData, error: dismissalError } = await supabase
    .from("notification_dismissals")
    .select("notification_id")
    .eq("user_id", userId);

  if (dismissalError) {
    if (!isNotificationSchemaError(dismissalError)) {
      console.error("[kolo:mobile-notifications] Dismissal fetch failed", {
        code: dismissalError.code,
        message: dismissalError.message,
        details: dismissalError.details,
      });
    }

    return notificationRows.map(mapAnnouncement);
  }

  const dismissedIds = new Set(
    ((dismissalData ?? []) as DismissalRow[]).map(
      (dismissal) => dismissal.notification_id,
    ),
  );

  return notificationRows
    .filter((notification) => !dismissedIds.has(notification.id))
    .map(mapAnnouncement);
}

export async function dismissAnnouncement(
  notificationId: string,
  userId: string,
) {
  if (!isSupabaseConfigured || !notificationId || !userId) {
    return;
  }

  const { error } = await supabase.from("notification_dismissals").upsert(
    {
      notification_id: notificationId,
      user_id: userId,
    },
    { onConflict: "notification_id,user_id" },
  );

  if (error && !isNotificationSchemaError(error)) {
    console.error("[kolo:mobile-notifications] Dismiss failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
}

export async function dismissAnnouncements(
  notificationIds: string[],
  userId: string,
) {
  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean)));

  if (!isSupabaseConfigured || !userId || uniqueIds.length === 0) {
    return;
  }

  const { error } = await supabase.from("notification_dismissals").upsert(
    uniqueIds.map((notificationId) => ({
      notification_id: notificationId,
      user_id: userId,
    })),
    { onConflict: "notification_id,user_id" },
  );

  if (error && !isNotificationSchemaError(error)) {
    console.error("[kolo:mobile-notifications] Dismiss all failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
}

function mapAnnouncement(notification: NotificationRow): AppAnnouncement {
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
  };
}

function isNotificationSchemaError(error: { code?: string; message?: string }) {
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
