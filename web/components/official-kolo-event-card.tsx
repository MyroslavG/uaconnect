import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  MapPin,
  PartyPopper,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import {
  getKoloSummerPartyCopy,
  isKoloSummerPartyVisible,
  koloSummerParty,
} from "@/lib/official-events";

type OfficialKoloEventCardProps = {
  locale: Locale;
  variant?: "compact" | "full";
};

export function OfficialKoloEventCard({
  locale,
  variant = "compact",
}: OfficialKoloEventCardProps) {
  if (!isKoloSummerPartyVisible()) {
    return null;
  }

  const labels = getKoloSummerPartyCopy(locale);
  const isFull = variant === "full";

  return (
    <article className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-soft">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative aspect-[3/2] overflow-hidden">
          <Image
            alt={labels.imageAlt}
            className="object-cover"
            fill
            priority={isFull}
            sizes="(min-width: 1024px) 48vw, 100vw"
            src={koloSummerParty.imageUrl}
          />
        </div>

        <div className="flex flex-col p-5 md:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-background text-foreground">
              {labels.badge}
            </Badge>
            {labels.host ? <Badge variant="secondary">{labels.host}</Badge> : null}
          </div>

          <h2 className="mt-5 text-balance text-3xl font-black tracking-normal md:text-5xl">
            {labels.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {labels.summary}
          </p>

          <div className="mt-6 grid gap-3">
            <a
              className="group flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm font-black transition hover:border-hover-blue-border hover:bg-hover-blue"
              href={koloSummerParty.eventbriteUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">{labels.date}</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100" />
            </a>

            <a
              className="group flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm font-black transition hover:border-hover-blue-border hover:bg-hover-blue"
              href={koloSummerParty.mapUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">{labels.location}</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100" />
            </a>
          </div>

          {isFull ? (
            <div className="mt-7 space-y-5">
              <div>
                <p className="section-kicker">{labels.details}</p>
                <h3 className="mt-2 text-2xl font-black">
                  {labels.overviewTitle}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {labels.overview}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {labels.secondPart}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {labels.highlights.map((highlight) => (
                  <div
                    className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-bold"
                    key={highlight}
                  >
                    <PartyPopper className="h-4 w-4 text-primary" />
                    {highlight}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                    <p>{labels.safety}</p>
                    <p>{labels.registration}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-hover-blue hover:text-hover-blue-foreground"
                  href={koloSummerParty.eventbriteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {labels.eventbrite}
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-black transition hover:border-hover-blue-border hover:bg-hover-blue"
                  href={koloSummerParty.mapUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {labels.maps}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-hover-blue hover:text-hover-blue-foreground"
                href="/events"
              >
                {labels.details}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-black transition hover:border-hover-blue-border hover:bg-hover-blue"
                href={koloSummerParty.eventbriteUrl}
                rel="noreferrer"
                target="_blank"
              >
                {labels.eventbrite}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
