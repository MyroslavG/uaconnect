import type { Metadata } from "next";
import Link from "next/link";

import { OfficialKoloEventCard } from "@/components/official-kolo-event-card";
import { Badge } from "@/components/ui/badge";
import { getRequestLocale } from "@/lib/locale";
import { isKoloSummerPartyVisible } from "@/lib/official-events";

export const metadata: Metadata = {
  title: "Kolo Events",
  description:
    "Official Kolo events and community meetups for Ukrainians in Canada.",
};

const text = {
  uk: {
    badge: "Події Kolo",
    title: "Події для української спільноти",
    intro:
      "Тут з'являються офіційні зустрічі Kolo, сімейні події та партнерські активності.",
    emptyTitle: "Наразі немає активних подій",
    emptyText:
      "Коли буде нова офіційна зустріч Kolo, вона з'явиться на цій сторінці.",
    back: "На головну",
  },
  en: {
    badge: "Kolo Events",
    title: "Events for the Ukrainian community",
    intro:
      "Official Kolo meetups, family events, and partner activities appear here.",
    emptyTitle: "No active events right now",
    emptyText: "When a new official Kolo meetup is ready, it will appear here.",
    back: "Back to home",
  },
} as const;

export default async function EventsPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const hasOfficialEvent = isKoloSummerPartyVisible();

  return (
    <main className="bg-background">
      <section className="container max-w-6xl py-12 md:py-16">
        <Badge variant="outline" className="bg-card text-foreground">
          {labels.badge}
        </Badge>
        <h1 className="mt-5 max-w-4xl text-balance text-4xl font-black tracking-normal md:text-6xl">
          {labels.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          {labels.intro}
        </p>

        <div className="mt-8">
          {hasOfficialEvent ? (
            <OfficialKoloEventCard locale={locale} variant="full" />
          ) : (
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <h2 className="text-2xl font-black">{labels.emptyTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {labels.emptyText}
              </p>
              <Link
                className="mt-6 inline-flex rounded-md bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-hover-blue hover:text-hover-blue-foreground"
                href="/"
              >
                {labels.back}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
