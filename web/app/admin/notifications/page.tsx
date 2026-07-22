import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, Megaphone, ShieldCheck, Trash2, UsersRound } from "lucide-react";

import {
  deleteNotification,
  updateNotificationStatus,
} from "@/app/admin/notifications/actions";
import { signInWithGoogle } from "@/app/auth/actions";
import { AdminNotificationForm } from "@/components/admin-notification-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isNotificationSchemaError } from "@/lib/announcements";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin notifications",
  description: "Create Kolo update notifications for signed-in users.",
};

type NotificationRow = Database["public"]["Tables"]["app_notifications"]["Row"];

const text = {
  uk: {
    kicker: "Адмін",
    title: "Оновлення для користувачів",
    intro:
      "Створюйте короткі повідомлення про нові функції, зміни та важливі оновлення. Їх бачитимуть лише користувачі, які увійшли в акаунт.",
    createTitle: "Нове оновлення",
    existingTitle: "Опубліковані та чернетки",
    empty: "Оновлень поки немає.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до керування оновленнями.",
    setup: "Supabase ще не налаштовано.",
    schemaMissing:
      "Таблиці для оновлень ще не створені. Запустіть оновлений schema.sql у Supabase.",
    published: "Опубліковано",
    draft: "Чернетка",
    publish: "Опублікувати",
    moveToDraft: "У чернетку",
    delete: "Видалити",
    registrations: "Перевірка бізнесів",
    users: "Користувачі",
  },
  en: {
    kicker: "Admin",
    title: "User updates",
    intro:
      "Create short messages for new features, changes, and important updates. Only signed-in users will see them.",
    createTitle: "New update",
    existingTitle: "Published and drafts",
    empty: "No updates yet.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to notification management.",
    setup: "Supabase is not configured yet.",
    schemaMissing:
      "Notification tables are not created yet. Run the updated schema.sql in Supabase.",
    published: "Published",
    draft: "Draft",
    publish: "Publish",
    moveToDraft: "Move to draft",
    delete: "Delete",
    registrations: "Business review",
    users: "Users",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AdminNotificationsPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let notifications: NotificationRow[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("app_notifications")
      .select("*")
      .order("created_at", { ascending: false });

    notifications = data ?? [];
    errorMessage = error
      ? isNotificationSchemaError(error)
        ? labels.schemaMissing
        : error.message
      : "";
  }

  if (!isSupabaseConfigured()) {
    return <StatusCard text={labels.setup} />;
  }

  if (!user) {
    return (
      <StatusCard text={labels.noAccess}>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value="/admin/notifications" />
          <Button type="submit">{labels.signIn}</Button>
        </form>
      </StatusCard>
    );
  }

  if (!isAdmin) {
    return <StatusCard text={labels.noAccess} />;
  }

  return (
    <main className="container grid gap-8 py-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 w-fit" variant="secondary">
            {labels.kicker}
          </Badge>
          <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
            {labels.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {labels.intro}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/registrations">
              <ShieldCheck className="h-4 w-4" />
              {labels.registrations}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <UsersRound className="h-4 w-4" />
              {labels.users}
            </Link>
          </Button>
        </div>
      </section>

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-5 text-sm font-semibold text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-6 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-black">{labels.createTitle}</h2>
          </div>
          <AdminNotificationForm locale={locale} />
        </CardContent>
      </Card>

      <section className="grid gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-muted text-muted-foreground">
            <Bell className="h-5 w-5" />
          </span>
          <h2 className="text-2xl font-black">{labels.existingTitle}</h2>
        </div>

        {notifications.length > 0 ? (
          <div className="grid gap-3">
            {notifications.map((notification) => {
              const nextStatus =
                notification.status === "published" ? "draft" : "published";

              return (
                <Card key={notification.id}>
                  <CardContent className="grid gap-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Badge variant="secondary">
                          {notification.status === "published"
                            ? labels.published
                            : labels.draft}
                        </Badge>
                        <h3 className="mt-3 text-xl font-black">
                          {locale === "uk"
                            ? notification.title_uk
                            : notification.title_en}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {locale === "uk"
                            ? notification.body_uk
                            : notification.body_en}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <form action={updateNotificationStatus}>
                          <input
                            name="notificationId"
                            type="hidden"
                            value={notification.id}
                          />
                          <input
                            name="status"
                            type="hidden"
                            value={nextStatus}
                          />
                          <Button size="sm" type="submit" variant="outline">
                            {nextStatus === "published"
                              ? labels.publish
                              : labels.moveToDraft}
                          </Button>
                        </form>
                        <form action={deleteNotification}>
                          <input
                            name="notificationId"
                            type="hidden"
                            value={notification.id}
                          />
                          <Button size="sm" type="submit" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                            {labels.delete}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm font-semibold text-muted-foreground">
              {labels.empty}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

function StatusCard({
  children,
  text,
}: {
  children?: ReactNode;
  text: string;
}) {
  return (
    <main className="container py-10">
      <Card>
        <CardContent className="grid gap-4 p-6">
          <p className="text-sm font-semibold text-muted-foreground">{text}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
