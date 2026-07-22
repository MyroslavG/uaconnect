"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isNotificationSchemaError } from "@/lib/announcements";

export async function dismissNotification(notificationId: string) {
  const user = await getCurrentUser();

  if (!user || !notificationId) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notification_dismissals").upsert(
    {
      notification_id: notificationId,
      user_id: user.id,
    },
    { onConflict: "notification_id,user_id" },
  );

  if (error && !isNotificationSchemaError(error)) {
    console.error("[kolo:web-notifications] Dismiss failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  revalidatePath("/");
}

export async function dismissNotifications(notificationIds: string[]) {
  const user = await getCurrentUser();
  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean)));

  if (!user || uniqueIds.length === 0) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notification_dismissals").upsert(
    uniqueIds.map((notificationId) => ({
      notification_id: notificationId,
      user_id: user.id,
    })),
    { onConflict: "notification_id,user_id" },
  );

  if (error && !isNotificationSchemaError(error)) {
    console.error("[kolo:web-notifications] Dismiss all failed", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  revalidatePath("/");
}
