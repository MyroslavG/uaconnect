import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  type LucideIcon,
  MousePointerClick,
  RadioTower,
  Search,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  Grid3X3,
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
    media: "Media KPI",
    coverage: "Coverage",
    prospects: "Prospects",
    activeDay: "Активні за день",
    activeMonth: "Активні за місяць",
    searches: "Пошуки",
    profileViews: "Перегляди бізнесів",
    contactClicks: "Контакт-кліки",
    contactedBusinesses: "Бізнесів з контактами",
    funnel: "Базова воронка",
    funnelSubtitle: "Останні 30 днів",
    funnelStart: "Відкрили Kolo",
    funnelSignedIn: "Увійшли / мають акаунт",
    funnelSearched: "Зробили пошук",
    funnelViewedBusiness: "Відкрили бізнес",
    funnelContacted: "Натиснули контакт",
    conversionFromPrevious: "від попереднього кроку",
    acquisition: "Джерела залучення",
    acquisitionSubtitle:
      "Перший зафіксований канал користувача за останні 60 днів.",
    visitorsLabel: "відвідувачі",
    searchesLabel: "пошуки",
    viewsLabel: "перегляди",
    contactsLabel: "контакти",
    conversionLabel: "конверсія",
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
    media: "Media KPI",
    coverage: "Coverage",
    prospects: "Prospects",
    activeDay: "Active today",
    activeMonth: "Active this month",
    searches: "Searches",
    profileViews: "Business views",
    contactClicks: "Contact clicks",
    contactedBusinesses: "Businesses contacted",
    funnel: "Baseline funnel",
    funnelSubtitle: "Last 30 days",
    funnelStart: "Opened Kolo",
    funnelSignedIn: "Signed in / has account",
    funnelSearched: "Searched",
    funnelViewedBusiness: "Opened a business",
    funnelContacted: "Clicked contact",
    conversionFromPrevious: "from previous step",
    acquisition: "Acquisition sources",
    acquisitionSubtitle:
      "The first recorded user channel within the last 60 days.",
    visitorsLabel: "visitors",
    searchesLabel: "searches",
    viewsLabel: "views",
    contactsLabel: "contacts",
    conversionLabel: "conversion",
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
  const funnelStages = getFunnelStages(events, {
    contacted: labels.funnelContacted as string,
    opened: labels.funnelStart as string,
    searched: labels.funnelSearched as string,
    signedIn: labels.funnelSignedIn as string,
    viewedBusiness: labels.funnelViewedBusiness as string,
  });
  const acquisitionRows = getAcquisitionRows(events);

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
          <Button asChild variant="outline">
            <Link href="/admin/media">
              <RadioTower className="h-4 w-4" />
              {labels.media as string}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/coverage">
              <Grid3X3 className="h-4 w-4" />
              {labels.coverage as string}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/prospects">
              <ClipboardList className="h-4 w-4" />
              {labels.prospects as string}
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
        <FunnelCard
          conversionLabel={labels.conversionFromPrevious as string}
          empty={labels.noData as string}
          stages={funnelStages}
          subtitle={labels.funnelSubtitle as string}
          title={labels.funnel as string}
        />
        <AcquisitionCard
          contactsLabel={labels.contactsLabel as string}
          conversionLabel={labels.conversionLabel as string}
          empty={labels.noData as string}
          rows={acquisitionRows}
          searchesLabel={labels.searchesLabel as string}
          subtitle={labels.acquisitionSubtitle as string}
          title={labels.acquisition as string}
          viewsLabel={labels.viewsLabel as string}
          visitorsLabel={labels.visitorsLabel as string}
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

function FunnelCard({
  conversionLabel,
  empty,
  stages,
  subtitle,
  title,
}: {
  conversionLabel: string;
  empty: string;
  stages: Array<{ count: number; label: string; percent: number }>;
  subtitle: string;
  title: string;
}) {
  const maxCount = Math.max(1, ...stages.map((stage) => stage.count));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Badge variant="outline">{stages.length}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {stages.some((stage) => stage.count > 0) ? (
            stages.map((stage) => (
              <div
                className="rounded-md border bg-muted/30 p-3"
                key={stage.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{stage.label}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {stage.percent}% {conversionLabel}
                    </p>
                  </div>
                  <Badge>{stage.count}</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round((stage.count / maxCount) * 100),
                      )}%`,
                    }}
                  />
                </div>
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

function AcquisitionCard({
  contactsLabel,
  conversionLabel,
  empty,
  rows,
  searchesLabel,
  subtitle,
  title,
  viewsLabel,
  visitorsLabel,
}: {
  contactsLabel: string;
  conversionLabel: string;
  empty: string;
  rows: AcquisitionRow[];
  searchesLabel: string;
  subtitle: string;
  title: string;
  viewsLabel: string;
  visitorsLabel: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {rows.length ? (
            rows.slice(0, 8).map((row) => (
              <div
                className="rounded-md border bg-muted/30 p-3"
                key={row.source}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{row.source}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {row.conversion}% {conversionLabel}
                    </p>
                  </div>
                  <Badge>{row.visitors}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat label={visitorsLabel} value={row.visitors} />
                  <MiniStat label={searchesLabel} value={row.searchers} />
                  <MiniStat label={viewsLabel} value={row.businessViewers} />
                  <MiniStat label={contactsLabel} value={row.contactActors} />
                </div>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background/70 p-2">
      <p className="text-sm font-black">{value}</p>
      <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
    </div>
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
    searches:
      countEvents(last30DayEvents, "search") +
      countEvents(last30DayEvents, "search_zero_results"),
  };
}

function filterEventsWithinDays(events: AnalyticsEventRow[], days: number) {
  const since = Date.now() - days * dayInMs;

  return events.filter((event) => getEventTime(event) >= since);
}

function countEvents(events: AnalyticsEventRow[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length;
}

function getFunnelStages(
  events: AnalyticsEventRow[],
  labels: {
    contacted: string;
    opened: string;
    searched: string;
    signedIn: string;
    viewedBusiness: string;
  },
) {
  const recentEvents = filterEventsWithinDays(events, 30);
  const openedActors = getUniqueActorsFor(recentEvents, (event) =>
    ["app_open", "page_view"].includes(event.event_type),
  );
  const signedInActors = getUniqueActorsFor(
    recentEvents,
    (event) =>
      Boolean(event.user_id) || ["signin", "signup"].includes(event.event_type),
  );
  const searchedActors = getUniqueActorsFor(recentEvents, (event) =>
    ["search", "search_zero_results"].includes(event.event_type),
  );
  const businessViewActors = getUniqueActorsFor(
    recentEvents,
    (event) => event.event_type === "business_profile_view",
  );
  const contactActors = getUniqueActorsFor(
    recentEvents,
    (event) => event.event_type === "contact_click",
  );
  const stages = [
    { count: openedActors.size, label: labels.opened },
    { count: signedInActors.size, label: labels.signedIn },
    { count: searchedActors.size, label: labels.searched },
    { count: businessViewActors.size, label: labels.viewedBusiness },
    { count: contactActors.size, label: labels.contacted },
  ];

  return stages.map((stage, index) => ({
    ...stage,
    percent:
      index === 0
        ? 100
        : getPercent(stage.count, Math.max(1, stages[index - 1]?.count ?? 0)),
  }));
}

type AcquisitionRow = {
  businessViewers: number;
  contactActors: number;
  conversion: number;
  searchers: number;
  source: string;
  visitors: number;
};

function getAcquisitionRows(events: AnalyticsEventRow[]): AcquisitionRow[] {
  const sortedEvents = [...events].sort(
    (first, second) => getEventTime(first) - getEventTime(second),
  );
  const firstEventByActor = new Map<string, AnalyticsEventRow>();

  for (const event of sortedEvents) {
    const actorId = getActorId(event);

    if (!actorId || firstEventByActor.has(actorId)) {
      continue;
    }

    firstEventByActor.set(actorId, event);
  }

  const sourceByActor = new Map<string, string>();

  for (const [actorId, event] of firstEventByActor) {
    sourceByActor.set(actorId, getAcquisitionSource(event));
  }

  const rows = new Map<
    string,
    {
      businessViewers: Set<string>;
      contactActors: Set<string>;
      searchers: Set<string>;
      visitors: Set<string>;
    }
  >();

  for (const [actorId, source] of sourceByActor) {
    getOrCreateAcquisitionBucket(rows, source).visitors.add(actorId);
  }

  for (const event of filterEventsWithinDays(events, 30)) {
    const actorId = getActorId(event);
    const source = actorId ? sourceByActor.get(actorId) : null;

    if (!actorId || !source) {
      continue;
    }

    const bucket = getOrCreateAcquisitionBucket(rows, source);

    if (["search", "search_zero_results"].includes(event.event_type)) {
      bucket.searchers.add(actorId);
    }

    if (event.event_type === "business_profile_view") {
      bucket.businessViewers.add(actorId);
    }

    if (event.event_type === "contact_click") {
      bucket.contactActors.add(actorId);
    }
  }

  return [...rows.entries()]
    .map(([source, bucket]) => ({
      businessViewers: bucket.businessViewers.size,
      contactActors: bucket.contactActors.size,
      conversion: getPercent(bucket.contactActors.size, bucket.visitors.size),
      searchers: bucket.searchers.size,
      source,
      visitors: bucket.visitors.size,
    }))
    .sort((first, second) => second.visitors - first.visitors);
}

function getOrCreateAcquisitionBucket(
  rows: Map<
    string,
    {
      businessViewers: Set<string>;
      contactActors: Set<string>;
      searchers: Set<string>;
      visitors: Set<string>;
    }
  >,
  source: string,
) {
  const existingBucket = rows.get(source);

  if (existingBucket) {
    return existingBucket;
  }

  const nextBucket = {
    businessViewers: new Set<string>(),
    contactActors: new Set<string>(),
    searchers: new Set<string>(),
    visitors: new Set<string>(),
  };

  rows.set(source, nextBucket);

  return nextBucket;
}

function getUniqueActorsFor(
  events: AnalyticsEventRow[],
  predicate: (event: AnalyticsEventRow) => boolean,
) {
  return new Set(
    events.filter(predicate).map(getActorId).filter(Boolean) as string[],
  );
}

function getPercent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function getAcquisitionSource(event: AnalyticsEventRow) {
  const utmSource =
    getMetadataString(event, "utmSource") ??
    getMetadataString(event, "utm_source");

  if (utmSource) {
    return getReadableLabel(utmSource);
  }

  const source = getMetadataString(event, "source");

  if (source && !["mobile", "web"].includes(source.toLowerCase())) {
    return getReadableLabel(source);
  }

  const referrer = getMetadataString(event, "referrer");
  const referrerHost = getReferrerHost(referrer);

  if (referrerHost) {
    return referrerHost;
  }

  return event.platform === "mobile" ? "Mobile app" : "Direct";
}

function getMetadataString(event: AnalyticsEventRow, key: string) {
  const metadata = event.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getReferrerHost(referrer: string | null) {
  if (!referrer) {
    return null;
  }

  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, "");

    return hostname.includes("koloapp.ca") ||
      hostname.includes("uaconnect.vercel.app") ||
      hostname.includes("ua-connect.netlify.app")
      ? null
      : hostname;
  } catch {
    return null;
  }
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
    if (!["search", "search_zero_results"].includes(event.event_type)) {
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
