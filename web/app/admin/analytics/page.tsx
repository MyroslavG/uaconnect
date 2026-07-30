import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  type LucideIcon,
  MousePointerClick,
  Search,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  cities,
  getCategory,
  getCity,
} from "@/lib/data";
import {
  localizeCategory,
  localizeCity,
  type Locale,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AnalyticsContactType,
  Database,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin analytics",
  description: "Kolo user journey and business contact analytics.",
};

type AnalyticsEventRow =
  Database["public"]["Tables"]["analytics_events"]["Row"];

const dayInMs = 24 * 60 * 60 * 1000;

const text = {
  uk: {
    kicker: "Адмін",
    title: "Аналітика Kolo",
    intro:
      "Шлях користувача від відкриття застосунку до пошуку, перегляду бізнесу й натискання контактів.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до аналітики.",
    setup: "Supabase ще не налаштовано.",
    schemaMissing:
      "Таблицю analytics_events ще не створено. Запустіть оновлений schema.sql у Supabase.",
    registrations: "Перевірка бізнесів",
    users: "Користувачі",
    updates: "Оновлення",
    activeDay: "Активні за день",
    activeMonth: "Активні за місяць",
    searches: "Пошуки",
    profileViews: "Перегляди бізнесів",
    contactClicks: "Контакт-кліки",
    contactedBusinesses: "Бізнесів з контактами",
    retention: "Повернення користувачів",
    topCities: "Найчастіші міста",
    topCategories: "Найчастіші категорії",
    contactBreakdown: "Кліки по контактах",
    businessesWithContacts: "Бізнеси, які отримали контакт",
    noData: "Даних поки недостатньо.",
    last30: "Останні 30 днів",
    last60: "Retention рахується за останні 60 днів",
    day1: "1 день",
    day7: "7 днів",
    day30: "30 днів",
    usersLabel: "користувачів",
    eventsLabel: "подій",
    contactLabels: {
      address: "Адреса",
      instagram: "Instagram",
      link: "Посилання",
      phone: "Телефон",
      route: "Маршрут",
      website: "Сайт",
    },
  },
  en: {
    kicker: "Admin",
    title: "Kolo analytics",
    intro:
      "User journey from app open to search, business views, and contact clicks.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to analytics.",
    setup: "Supabase is not configured yet.",
    schemaMissing:
      "The analytics_events table has not been created yet. Run the updated schema.sql in Supabase.",
    registrations: "Business review",
    users: "Users",
    updates: "Updates",
    activeDay: "Active today",
    activeMonth: "Active this month",
    searches: "Searches",
    profileViews: "Business views",
    contactClicks: "Contact clicks",
    contactedBusinesses: "Businesses contacted",
    retention: "User retention",
    topCities: "Top searched cities",
    topCategories: "Top searched categories",
    contactBreakdown: "Contact click breakdown",
    businessesWithContacts: "Businesses that received contact",
    noData: "Not enough data yet.",
    last30: "Last 30 days",
    last60: "Retention uses the last 60 days",
    day1: "1 day",
    day7: "7 days",
    day30: "30 days",
    usersLabel: "users",
    eventsLabel: "events",
    contactLabels: {
      address: "Address",
      instagram: "Instagram",
      link: "Link",
      phone: "Phone",
      route: "Route",
      website: "Website",
    },
  },
} satisfies Record<Locale, Record<string, unknown>>;

export default async function AdminAnalyticsPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let events: AnalyticsEventRow[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const since = new Date(Date.now() - 60 * dayInMs).toISOString();
    const { data, error } = await supabase
      .from("analytics_events")
      .select("*")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(10000);

    events = data ?? [];
    errorMessage = error
      ? isAnalyticsSchemaError(error.message)
        ? (labels.schemaMissing as string)
        : error.message
      : "";
  }

  if (!isSupabaseConfigured()) {
    return <StatusCard text={labels.setup as string} />;
  }

  if (!user) {
    return (
      <StatusCard text={labels.noAccess as string}>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value="/admin/analytics" />
          <Button type="submit">{labels.signIn as string}</Button>
        </form>
      </StatusCard>
    );
  }

  if (!isAdmin) {
    return <StatusCard text={labels.noAccess as string} />;
  }

  const summary = getAnalyticsSummary(events);
  const topCities = getTopSearchValues(events, "city", locale);
  const topCategories = getTopSearchValues(events, "category_slug", locale);
  const contactBreakdown = getContactBreakdown(events);
  const contactedBusinesses = getContactedBusinesses(events);

  return (
    <main className="container grid gap-8 py-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 w-fit" variant="secondary">
            {labels.kicker as string}
          </Badge>
          <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
            {labels.title as string}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {labels.intro as string}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/registrations">
              <ShieldCheck className="h-4 w-4" />
              {labels.registrations as string}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <UsersRound className="h-4 w-4" />
              {labels.users as string}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/notifications">
              <CalendarClock className="h-4 w-4" />
              {labels.updates as string}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          Icon={UsersRound}
          label={labels.activeDay as string}
          value={summary.activeDay}
        />
        <MetricCard
          Icon={UsersRound}
          label={labels.activeMonth as string}
          value={summary.activeMonth}
        />
        <MetricCard
          Icon={Search}
          label={labels.searches as string}
          value={summary.searches}
        />
        <MetricCard
          Icon={BarChart3}
          label={labels.profileViews as string}
          value={summary.businessViews}
        />
        <MetricCard
          Icon={MousePointerClick}
          label={labels.contactClicks as string}
          value={summary.contactClicks}
        />
        <MetricCard
          Icon={TrendingUp}
          label={labels.contactedBusinesses as string}
          value={summary.contactedBusinesses}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">
                  {labels.retention as string}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {labels.last60 as string}
                </p>
              </div>
              <Badge variant="outline">{labels.usersLabel as string}</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              <RetentionRow
                label={labels.day1 as string}
                value={summary.retention.day1}
              />
              <RetentionRow
                label={labels.day7 as string}
                value={summary.retention.day7}
              />
              <RetentionRow
                label={labels.day30 as string}
                value={summary.retention.day30}
              />
            </div>
          </CardContent>
        </Card>

        <TopListCard
          empty={labels.noData as string}
          subtitle={labels.last30 as string}
          title={labels.topCities as string}
          values={topCities}
        />
        <TopListCard
          empty={labels.noData as string}
          subtitle={labels.last30 as string}
          title={labels.topCategories as string}
          values={topCategories}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TopListCard
          empty={labels.noData as string}
          subtitle={labels.last30 as string}
          title={labels.contactBreakdown as string}
          values={contactBreakdown.map((item) => ({
            ...item,
            label:
              (labels.contactLabels as Record<AnalyticsContactType, string>)[
                item.label as AnalyticsContactType
              ] ?? item.label,
          }))}
        />
        <TopListCard
          empty={labels.noData as string}
          subtitle={labels.last30 as string}
          title={labels.businessesWithContacts as string}
          values={contactedBusinesses}
        />
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

function MetricCard({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-3xl font-black">{value}</span>
        </div>
        <p className="mt-4 text-sm font-bold text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function RetentionRow({
  label,
  value,
}: {
  label: string;
  value: { count: number; percent: number };
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black">{label}</span>
        <span className="text-lg font-black">{value.percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, value.percent)}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {value.count}
      </p>
    </div>
  );
}

function TopListCard({
  empty,
  subtitle,
  title,
  values,
}: {
  empty: string;
  subtitle: string;
  title: string;
  values: Array<{ count: number; label: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Badge variant="outline">{values.length}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {values.length ? (
            values.slice(0, 8).map((item) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3"
                key={item.label}
              >
                <span className="min-w-0 truncate text-sm font-black">
                  {item.label}
                </span>
                <Badge>{item.count}</Badge>
              </div>
            ))
          ) : (
            <p className="rounded-md border bg-muted/30 p-4 text-sm font-semibold text-muted-foreground">
              {empty}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getAnalyticsSummary(events: AnalyticsEventRow[]) {
  const lastDayEvents = filterEventsWithinDays(events, 1);
  const last30DayEvents = filterEventsWithinDays(events, 30);
  const contactClickEvents = last30DayEvents.filter(
    (event) => event.event_type === "contact_click",
  );

  return {
    activeDay: getUniqueActorCount(lastDayEvents),
    activeMonth: getUniqueActorCount(last30DayEvents),
    businessViews: countEvents(last30DayEvents, "business_profile_view"),
    contactClicks: contactClickEvents.length,
    contactedBusinesses: new Set(
      contactClickEvents
        .map((event) => event.business_id ?? event.business_slug)
        .filter(Boolean),
    ).size,
    retention: {
      day1: getRetention(events, 1),
      day7: getRetention(events, 7),
      day30: getRetention(events, 30),
    },
    searches: countEvents(last30DayEvents, "search"),
  };
}

function filterEventsWithinDays(events: AnalyticsEventRow[], days: number) {
  const since = Date.now() - days * dayInMs;

  return events.filter((event) => getEventTime(event) >= since);
}

function countEvents(events: AnalyticsEventRow[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length;
}

function getUniqueActorCount(events: AnalyticsEventRow[]) {
  return new Set(events.map(getActorId).filter(Boolean)).size;
}

function getRetention(events: AnalyticsEventRow[], days: number) {
  const eventsByActor = new Map<string, AnalyticsEventRow[]>();
  const cutoff = Date.now() - days * dayInMs;

  for (const event of events) {
    const actorId = getActorId(event);

    if (!actorId) {
      continue;
    }

    eventsByActor.set(actorId, [...(eventsByActor.get(actorId) ?? []), event]);
  }

  let eligible = 0;
  let retained = 0;

  for (const actorEvents of eventsByActor.values()) {
    const sortedEvents = [...actorEvents].sort(
      (first, second) => getEventTime(first) - getEventTime(second),
    );
    const firstSeenAt = getEventTime(sortedEvents[0]);

    if (firstSeenAt > cutoff) {
      continue;
    }

    eligible += 1;

    if (
      sortedEvents.some(
        (event) => getEventTime(event) >= firstSeenAt + days * dayInMs,
      )
    ) {
      retained += 1;
    }
  }

  return {
    count: retained,
    percent: eligible ? Math.round((retained / eligible) * 100) : 0,
  };
}

function getTopSearchValues(
  events: AnalyticsEventRow[],
  field: "category_slug" | "city",
  locale: Locale,
) {
  const counts = new Map<string, number>();

  for (const event of filterEventsWithinDays(events, 30)) {
    if (event.event_type !== "search") {
      continue;
    }

    const value = event[field]?.trim();

    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return sortCounts(counts).map((item) => ({
    ...item,
    label:
      field === "category_slug"
        ? getCategoryLabel(item.label, locale)
        : getCityLabel(item.label, locale),
  }));
}

function getContactBreakdown(events: AnalyticsEventRow[]) {
  const counts = new Map<string, number>();

  for (const event of filterEventsWithinDays(events, 30)) {
    if (event.event_type !== "contact_click" || !event.contact_type) {
      continue;
    }

    counts.set(event.contact_type, (counts.get(event.contact_type) ?? 0) + 1);
  }

  return sortCounts(counts);
}

function getContactedBusinesses(events: AnalyticsEventRow[]) {
  const counts = new Map<string, number>();

  for (const event of filterEventsWithinDays(events, 30)) {
    if (event.event_type !== "contact_click") {
      continue;
    }

    const label =
      event.business_name?.trim() ||
      event.business_slug?.trim() ||
      event.business_id?.trim();

    if (!label) {
      continue;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return sortCounts(counts);
}

function sortCounts(counts: Map<string, number>) {
  return [...counts.entries()]
    .map(([label, count]) => ({ count, label }))
    .sort((first, second) => second.count - first.count);
}

function getActorId(event: AnalyticsEventRow) {
  return event.user_id ?? event.anonymous_id ?? event.session_id;
}

function getEventTime(event: AnalyticsEventRow | undefined) {
  if (!event) {
    return 0;
  }

  const timestamp = new Date(event.occurred_at).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getCategoryLabel(value: string, locale: Locale) {
  const category = getCategory(value);

  if (category) {
    return localizeCategory(category, locale).name;
  }

  return getReadableLabel(value);
}

function getCityLabel(value: string, locale: Locale) {
  const city = getCity(value);

  if (city) {
    return localizeCity(city, locale).name;
  }

  const nearbyCity = cities.find(
    (candidate) => candidate.name.toLowerCase() === value.toLowerCase(),
  );

  if (nearbyCity) {
    return localizeCity(nearbyCity, locale).name;
  }

  return getReadableLabel(value);
}

function getReadableLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isAnalyticsSchemaError(message: string) {
  return (
    message.includes("analytics_events") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("Could not find"))
  );
}
