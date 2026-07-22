"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell, X } from "lucide-react";

import {
  dismissNotification,
  dismissNotifications,
} from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@/lib/announcements";
import type { Locale } from "@/lib/i18n";

type UpdateNotificationsProps = {
  announcements: Announcement[];
  locale: Locale;
};

export function UpdateNotifications({
  announcements,
  locale,
}: UpdateNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [visibleAnnouncements, setVisibleAnnouncements] =
    useState(announcements);

  useEffect(() => {
    setVisibleAnnouncements(announcements);
  }, [announcements]);

  const labels =
    locale === "uk"
      ? {
          close: "Закрити",
          dismiss: "Приховати",
          dismissAll: "Приховати всі",
          empty: "Нових оновлень немає.",
          title: "Оновлення",
        }
      : {
          close: "Close",
          dismiss: "Dismiss",
          dismissAll: "Dismiss all",
          empty: "No new updates.",
          title: "Updates",
        };
  const count = visibleAnnouncements.length;

  function dismissAnnouncement(id: string) {
    setVisibleAnnouncements((currentAnnouncements) =>
      currentAnnouncements.filter((announcement) => announcement.id !== id),
    );
    startTransition(() => {
      void dismissNotification(id);
    });
  }

  function dismissAll() {
    const notificationIds = visibleAnnouncements.map(
      (announcement) => announcement.id,
    );

    setVisibleAnnouncements([]);
    startTransition(() => {
      void dismissNotifications(notificationIds);
    });
    setIsOpen(false);
  }

  if (count === 0 && !isOpen) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        aria-expanded={isOpen}
        aria-label={labels.title}
        className="relative"
        onClick={() => setIsOpen((value) => !value)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-primary-foreground">
            {count}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="text-sm font-black">{labels.title}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {count} {labels.title.toLowerCase()}
              </p>
            </div>
            <button
              aria-label={labels.close}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {visibleAnnouncements.length > 0 ? (
              visibleAnnouncements.map((announcement) => (
                <article
                  className="grid gap-3 rounded-md border bg-card p-3 shadow-sm"
                  key={announcement.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-md border bg-background px-2 py-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        {announcement.badge[locale]}
                      </span>
                      <h2 className="mt-3 text-sm font-black">
                        {announcement.title[locale]}
                      </h2>
                    </div>
                    <button
                      aria-label={labels.dismiss}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      disabled={isPending}
                      onClick={() => dismissAnnouncement(announcement.id)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {announcement.body[locale]}
                  </p>
                  {announcement.href && announcement.cta ? (
                    <Link
                      className="inline-flex text-sm font-black text-primary transition hover:text-foreground"
                      href={announcement.href}
                      onClick={() => setIsOpen(false)}
                    >
                      {announcement.cta[locale]}
                    </Link>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-md bg-muted/60 px-3 py-6 text-center text-sm font-semibold text-muted-foreground">
                {labels.empty}
              </p>
            )}
          </div>

          {visibleAnnouncements.length > 1 ? (
            <div className="border-t p-2">
              <Button
                className="w-full"
                disabled={isPending}
                onClick={dismissAll}
                size="sm"
                type="button"
                variant="ghost"
              >
                {labels.dismissAll}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
