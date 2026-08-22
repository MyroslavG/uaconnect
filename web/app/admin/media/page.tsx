import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  ExternalLink,
  Grid3X3,
  MousePointerClick,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Timer,
  Trash2,
  TrendingUp,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { deleteMediaKpiSnapshot } from "@/app/admin/media/actions";
import { signInWithGoogle } from "@/app/auth/actions";
import { AdminMediaKpiForm } from "@/components/admin-media-kpi-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin media KPIs",
  description: "Track Kolo social, interview, and campaign performance.",
};

type AnalyticsEventRow =
  Database["public"]["Tables"]["analytics_events"]["Row"];
type MediaKpiSnapshotRow =
  Database["public"]["Tables"]["media_kpi_snapshots"]["Row"];

const dayInMs = 24 * 60 * 60 * 1000;

const text = {
  uk: {
    kicker: "Адмін",
    title: "Соцмережі та інтерв'ю",
    intro:
      "Трекер для каналів, інтерв'ю, анонсів і кампаній: перегляди, watch time, кліки, реєстрації та бізнес-ліди.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до media KPI.",
    setup: "Supabase ще не налаштовано.",
    schemaMissing:
      "Таблицю media_kpi_snapshots ще не створено. Запустіть оновлений schema.sql у Supabase.",
    analytics: "Аналітика",
    coverage: "Coverage",
    prospects: "Prospects",
    registrations: "Перевірка бізнесів",
    users: "Користувачі",
    addSnapshot: "Додати KPI snapshot",
    channelGrowth: "Ріст підписників",
    views: "Перегляди",
    watchTime: "Watch time",
    clicks: "Кліки",
    registrationsMetric: "Реєстрації",
    businessLeads: "Бізнес-ліди",
    last30: "Останні 30 днів",
    manualAndApp: "ручні KPI + app/web події",
    channelPerformance: "Performance по каналах",
    campaignPerformance: "Performance по кампаніях",
    recentSnapshots: "Останні snapshots",
    productSignals: "Product signals з web/mobile",
    noData: "Даних поки немає.",
    channel: "Канал",
    campaign: "Кампанія",
    type: "Тип",
    date: "Дата",
    open: "Відкрити",
    delete: "Видалити",
    followers: "Підписники",
    profileViews: "Перегляди бізнесів",
    contactClicks: "Контакт-кліки",
    businessSubmits: "Заявки бізнесів",
    minutes: "хв",
  },
  en: {
    kicker: "Admin",
    title: "Social and interviews",
    intro:
      "Tracker for channels, interviews, announcements, and campaigns: views, watch time, clicks, registrations, and business leads.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to media KPIs.",
    setup: "Supabase is not configured yet.",
    schemaMissing:
      "The media_kpi_snapshots table has not been created yet. Run the updated schema.sql in Supabase.",
    analytics: "Analytics",
    coverage: "Coverage",
    prospects: "Prospects",
    registrations: "Business review",
    users: "Users",
    addSnapshot: "Add KPI snapshot",
    channelGrowth: "Follower growth",
    views: "Views",
    watchTime: "Watch time",
    clicks: "Clicks",
    registrationsMetric: "Registrations",
    businessLeads: "Business leads",
    last30: "Last 30 days",
    manualAndApp: "manual KPIs + app/web events",
    channelPerformance: "Channel performance",
    campaignPerformance: "Campaign performance",
    recentSnapshots: "Recent snapshots",
    productSignals: "Product signals from web/mobile",
    noData: "No data yet.",
    channel: "Channel",
    campaign: "Campaign",
    type: "Type",
    date: "Date",
    open: "Open",
    delete: "Delete",
    followers: "Followers",
    profileViews: "Business views",
    contactClicks: "Contact clicks",
    businessSubmits: "Business submits",
    minutes: "min",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AdminMediaPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let events: AnalyticsEventRow[] = [];
  let snapshots: MediaKpiSnapshotRow[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const since = new Date(Date.now() - 60 * dayInMs).toISOString();
    const [eventsResult, snapshotsResult] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("*")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(10000),
      supabase
        .from("media_kpi_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    events = eventsResult.data ?? [];
    snapshots = snapshotsResult.data ?? [];
    errorMessage =
      snapshotsResult.error && isMediaSchemaError(snapshotsResult.error.message)
        ? labels.schemaMissing
        : snapshotsResult.error?.message ||
          eventsResult.error?.message ||
          "";
  }

  if (!isSupabaseConfigured()) {
    return <StatusCard text={labels.setup} />;
  }

  if (!user) {
    return (
      <StatusCard text={labels.noAccess}>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value="/admin/media" />
          <Button type="submit">{labels.signIn}</Button>
        </form>
      </StatusCard>
    );
  }

  if (!isAdmin) {
    return <StatusCard text={labels.noAccess} />;
  }

  const summary = getMediaSummary(snapshots, events);
  const channelRows = getChannelRows(snapshots);
  const campaignRows = getCampaignRows(snapshots);
  const productSignals = getProductSignals(events);

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
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4" />
              {labels.analytics}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/coverage">
              <Grid3X3 className="h-4 w-4" />
              {labels.coverage}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/prospects">
              <ClipboardList className="h-4 w-4" />
              {labels.prospects}
            </Link>
          </Button>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          Icon={TrendingUp}
          label={labels.channelGrowth}
          value={formatSignedNumber(summary.followerGrowth)}
        />
        <MetricCard
          Icon={PlayCircle}
          label={labels.views}
          value={formatNumber(summary.views)}
        />
        <MetricCard
          Icon={Timer}
          label={labels.watchTime}
          suffix={labels.minutes}
          value={formatNumber(summary.watchTimeMinutes)}
        />
        <MetricCard
          Icon={MousePointerClick}
          label={labels.clicks}
          value={formatNumber(summary.clicks)}
        />
        <MetricCard
          Icon={UserPlus}
          label={labels.registrationsMetric}
          value={formatNumber(summary.registrations)}
        />
        <MetricCard
          Icon={BriefcaseBusiness}
          label={labels.businessLeads}
          value={formatNumber(summary.businessLeads)}
        />
      </section>

      <Card>
        <CardContent className="grid gap-6 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <RadioTower className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black">{labels.addSnapshot}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.manualAndApp}
              </p>
            </div>
          </div>
          <AdminMediaKpiForm locale={locale} />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <KpiTableCard
          empty={labels.noData}
          rows={channelRows}
          subtitle={labels.last30}
          title={labels.channelPerformance}
        />
        <ProductSignalsCard labels={labels} signals={productSignals} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <KpiTableCard
          empty={labels.noData}
          rows={campaignRows}
          subtitle={labels.last30}
          title={labels.campaignPerformance}
        />
        <RecentSnapshotsCard
          empty={labels.noData}
          labels={labels}
          locale={locale}
          snapshots={snapshots}
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
  suffix,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  suffix?: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-5 text-3xl font-black">
          {value}
          {suffix ? (
            <span className="ml-1 text-sm font-bold text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </p>
        <p className="mt-3 text-sm font-bold text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function KpiTableCard({
  empty,
  rows,
  subtitle,
  title,
}: {
  empty: string;
  rows: KpiRow[];
  subtitle: string;
  title: string;
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
              <div className="rounded-md border bg-muted/30 p-3" key={row.key}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{row.label}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {row.meta}
                    </p>
                  </div>
                  <Badge>{formatNumber(row.views)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <MiniStat label="Views" value={row.views} />
                  <MiniStat label="Watch" value={row.watchTimeMinutes} />
                  <MiniStat label="Clicks" value={row.clicks} />
                  <MiniStat label="Regs" value={row.registrations} />
                  <MiniStat label="Leads" value={row.businessLeads} />
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

function ProductSignalsCard({
  labels,
  signals,
}: {
  labels: (typeof text)["uk"];
  signals: ProductSignals;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{labels.productSignals}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.last30}</p>
          </div>
          <Badge variant="outline">app + web</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <SignalTile label={labels.profileViews} value={signals.profileViews} />
          <SignalTile label={labels.contactClicks} value={signals.contactClicks} />
          <SignalTile label={labels.registrationsMetric} value={signals.signups} />
          <SignalTile label={labels.businessSubmits} value={signals.businessSubmits} />
        </div>
      </CardContent>
    </Card>
  );
}

function SignalTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="text-2xl font-black">{formatNumber(value)}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function RecentSnapshotsCard({
  empty,
  labels,
  locale,
  snapshots,
}: {
  empty: string;
  labels: (typeof text)["uk"];
  locale: Locale;
  snapshots: MediaKpiSnapshotRow[];
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{labels.recentSnapshots}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.last30}</p>
          </div>
          <Badge variant="outline">{snapshots.length}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {snapshots.length ? (
            snapshots.slice(0, 8).map((snapshot) => (
              <div
                className="rounded-md border bg-muted/30 p-3"
                key={snapshot.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {getReadableLabel(snapshot.channel)}
                      </Badge>
                      <Badge variant="outline">
                        {getReadableLabel(snapshot.campaign_type)}
                      </Badge>
                    </div>
                    <h3 className="mt-3 truncate text-base font-black">
                      {snapshot.campaign_name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {formatDate(snapshot.snapshot_date, locale)} ·{" "}
                      {formatNumber(snapshot.views)} {labels.views}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {snapshot.url ? (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={snapshot.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {labels.open}
                        </a>
                      </Button>
                    ) : null}
                    <form action={deleteMediaKpiSnapshot}>
                      <input name="snapshotId" type="hidden" value={snapshot.id} />
                      <Button size="sm" type="submit" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                        {labels.delete}
                      </Button>
                    </form>
                  </div>
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
      <p className="text-sm font-black">{formatNumber(value)}</p>
      <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

type KpiRow = {
  businessLeads: number;
  clicks: number;
  key: string;
  label: string;
  meta: string;
  registrations: number;
  views: number;
  watchTimeMinutes: number;
};

type ProductSignals = {
  businessSubmits: number;
  contactClicks: number;
  profileViews: number;
  signups: number;
};

function getMediaSummary(
  snapshots: MediaKpiSnapshotRow[],
  events: AnalyticsEventRow[],
) {
  const recentSnapshots = filterSnapshotsWithinDays(snapshots, 30);
  const productSignals = getProductSignals(events);

  return {
    businessLeads:
      sumSnapshots(recentSnapshots, "business_leads") +
      productSignals.businessSubmits,
    clicks: sumSnapshots(recentSnapshots, "clicks"),
    followerGrowth: getFollowerGrowth(snapshots),
    registrations:
      sumSnapshots(recentSnapshots, "registrations") + productSignals.signups,
    views: sumSnapshots(recentSnapshots, "views"),
    watchTimeMinutes: sumSnapshots(recentSnapshots, "watch_time_minutes"),
  };
}

function getProductSignals(events: AnalyticsEventRow[]): ProductSignals {
  const recentEvents = filterEventsWithinDays(events, 30);

  return {
    businessSubmits: countEvents(recentEvents, "business_submit"),
    contactClicks: countEvents(recentEvents, "contact_click"),
    profileViews: countEvents(recentEvents, "business_profile_view"),
    signups: countEvents(recentEvents, "signup"),
  };
}

function getChannelRows(snapshots: MediaKpiSnapshotRow[]): KpiRow[] {
  const rows = new Map<string, KpiRow>();

  for (const snapshot of filterSnapshotsWithinDays(snapshots, 30)) {
    const row = getOrCreateKpiRow(
      rows,
      snapshot.channel,
      getReadableLabel(snapshot.channel),
      "channel",
    );

    addSnapshotToRow(row, snapshot);
  }

  return sortKpiRows(rows);
}

function getCampaignRows(snapshots: MediaKpiSnapshotRow[]): KpiRow[] {
  const rows = new Map<string, KpiRow>();

  for (const snapshot of filterSnapshotsWithinDays(snapshots, 30)) {
    const row = getOrCreateKpiRow(
      rows,
      `${snapshot.channel}-${snapshot.campaign_name}`,
      snapshot.campaign_name,
      getReadableLabel(snapshot.channel),
    );

    addSnapshotToRow(row, snapshot);
  }

  return sortKpiRows(rows);
}

function getOrCreateKpiRow(
  rows: Map<string, KpiRow>,
  key: string,
  label: string,
  meta: string,
) {
  const existingRow = rows.get(key);

  if (existingRow) {
    return existingRow;
  }

  const nextRow = {
    businessLeads: 0,
    clicks: 0,
    key,
    label,
    meta,
    registrations: 0,
    views: 0,
    watchTimeMinutes: 0,
  };

  rows.set(key, nextRow);

  return nextRow;
}

function addSnapshotToRow(row: KpiRow, snapshot: MediaKpiSnapshotRow) {
  row.businessLeads += snapshot.business_leads;
  row.clicks += snapshot.clicks;
  row.registrations += snapshot.registrations;
  row.views += snapshot.views;
  row.watchTimeMinutes += snapshot.watch_time_minutes;
}

function sortKpiRows(rows: Map<string, KpiRow>) {
  return [...rows.values()].sort((first, second) => {
    const firstScore = first.views + first.clicks * 20 + first.businessLeads * 50;
    const secondScore =
      second.views + second.clicks * 20 + second.businessLeads * 50;

    return secondScore - firstScore;
  });
}

function getFollowerGrowth(snapshots: MediaKpiSnapshotRow[]) {
  const snapshotsByChannel = new Map<string, MediaKpiSnapshotRow[]>();

  for (const snapshot of snapshots) {
    snapshotsByChannel.set(snapshot.channel, [
      ...(snapshotsByChannel.get(snapshot.channel) ?? []),
      snapshot,
    ]);
  }

  let growth = 0;

  for (const channelSnapshots of snapshotsByChannel.values()) {
    const sortedSnapshots = [...channelSnapshots].sort(
      (first, second) =>
        new Date(first.snapshot_date).getTime() -
        new Date(second.snapshot_date).getTime(),
    );
    const firstFollowers = sortedSnapshots[0]?.followers ?? 0;
    const latestFollowers =
      sortedSnapshots[sortedSnapshots.length - 1]?.followers ?? 0;

    growth += latestFollowers - firstFollowers;
  }

  return growth;
}

function filterSnapshotsWithinDays(
  snapshots: MediaKpiSnapshotRow[],
  days: number,
) {
  const since = Date.now() - days * dayInMs;

  return snapshots.filter(
    (snapshot) => new Date(snapshot.snapshot_date).getTime() >= since,
  );
}

function filterEventsWithinDays(events: AnalyticsEventRow[], days: number) {
  const since = Date.now() - days * dayInMs;

  return events.filter((event) => new Date(event.occurred_at).getTime() >= since);
}

function countEvents(events: AnalyticsEventRow[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length;
}

function sumSnapshots(
  snapshots: MediaKpiSnapshotRow[],
  field:
    | "business_leads"
    | "clicks"
    | "registrations"
    | "views"
    | "watch_time_minutes",
) {
  return snapshots.reduce((total, snapshot) => total + snapshot[field], 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-CA").format(value);
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-CA" : "en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getReadableLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isMediaSchemaError(message: string) {
  return (
    message.includes("media_kpi_snapshots") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("Could not find"))
  );
}
