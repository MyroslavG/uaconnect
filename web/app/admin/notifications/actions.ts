"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AppNotificationStatus,
  Database,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AdminNotificationActionState = {
  ok: boolean;
  message: string;
};

type NotificationInsert =
  Database["public"]["Tables"]["app_notifications"]["Insert"];
type NotificationUpdate =
  Database["public"]["Tables"]["app_notifications"]["Update"];

export async function createNotification(
  _previousState: AdminNotificationActionState,
  formData: FormData,
): Promise<AdminNotificationActionState> {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.state;
  }

  const titleUk = requiredText(formData.get("titleUk"));
  const titleEn = requiredText(formData.get("titleEn"));
  const bodyUk = requiredText(formData.get("bodyUk"));
  const bodyEn = requiredText(formData.get("bodyEn"));
  const status = normalizeStatus(formData.get("status"));

  if (!titleUk || !titleEn || !bodyUk || !bodyEn || !status) {
    return {
      ok: false,
      message: "Add title and body in both languages.",
    };
  }

  const insert: NotificationInsert = {
    badge_uk: optionalText(formData.get("badgeUk")) ?? "Нове",
    badge_en: optionalText(formData.get("badgeEn")) ?? "New",
    title_uk: titleUk,
    title_en: titleEn,
    body_uk: bodyUk,
    body_en: bodyEn,
    href: optionalText(formData.get("href")),
    cta_uk: optionalText(formData.get("ctaUk")),
    cta_en: optionalText(formData.get("ctaEn")),
    status,
    created_by: adminCheck.userId,
    published_at: new Date().toISOString(),
  };

  const { error } = await adminCheck.supabase
    .from("app_notifications")
    .insert(insert);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateNotifications();

  return {
    ok: true,
    message: "Notification created.",
  };
}

export async function updateNotificationStatus(formData: FormData) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return;
  }

  const notificationId = requiredText(formData.get("notificationId"));
  const status = normalizeStatus(formData.get("status"));

  if (!notificationId || !status) {
    return;
  }

  const update: NotificationUpdate = { status };

  if (status === "published") {
    update.published_at = new Date().toISOString();
  }

  const { error } = await adminCheck.supabase
    .from("app_notifications")
    .update(update)
    .eq("id", notificationId);

  if (error) {
    console.error("[kolo:admin-notifications] Status update failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  revalidateNotifications();
}

export async function deleteNotification(formData: FormData) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return;
  }

  const notificationId = requiredText(formData.get("notificationId"));

  if (!notificationId) {
    return;
  }

  const { error } = await adminCheck.supabase
    .from("app_notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("[kolo:admin-notifications] Delete failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  revalidateNotifications();
}

async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      state: {
        ok: false,
        message: "Supabase is not configured yet.",
      },
    };
  }

  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user || !isAdmin) {
    return {
      ok: false as const,
      state: {
        ok: false,
        message: "Only admins can manage notifications.",
      },
    };
  }

  const supabase = await createClient();

  return {
    ok: true as const,
    supabase,
    userId: user.id,
  };
}

function revalidateNotifications() {
  revalidatePath("/");
  revalidatePath("/admin/notifications");
}

function normalizeStatus(
  value: FormDataEntryValue | null,
): AppNotificationStatus | null {
  return value === "draft" || value === "published" ? value : null;
}

function requiredText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

function optionalText(value: FormDataEntryValue | null) {
  return requiredText(value);
}
