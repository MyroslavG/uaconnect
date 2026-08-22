import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  ExternalLink,
  Grid3X3,
  RadioTower,
  Search,
  ShieldCheck,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories, cities, getCategory } from "@/lib/data";
import {
  localizeCategories,
  localizeCategory,
  localizeCity,
  type Locale,
} from "@/lib/i18n";
import { resolveCityFromLocationInput } from "@/lib/location";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin coverage matrix",
  description: "Kolo city and category supply-demand coverage matrix.",
};

type BusinessRow = Pick<
  Database["public"]["Tables"]["businesses"]["Row"],
  "category_slug" | "city" | "serves_all_canada" | "status"
>;
type AnalyticsEventRow = Pick<
  Database["public"]["Tables"]["analytics_events"]["Row"],
  "category_slug" | "city" | "event_type"
>;

type CoverageCell = {
  categoryLabel: string;
  categorySlug: string;
  cityLabel: string;
  citySlug: string;
  localSupply: number;
  nationalSupply: number;
  score: number;
  searchCount: number;
  status: "covered" | "empty" | "gap" | "thin";
  zeroResultCount: number;
};

type CityCoverageRow = {
  cells: CoverageCell[];
  cityLabel: string;
  citySlug: string;
  demand: number;
  localSupply: number;
  priorityGaps: number;
  zeroResultCount: number;
};

const dayInMs = 24 * 60 * 60 * 1000;

const text = {
  uk: {
    kicker: "Адмін",
    title: "City-category coverage matrix",
    intro:
      "Показує, де Kolo має достатньо бізнесів, а де є попит із пошуку, але мало або нуль локальних результатів.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до coverage matrix.",
    setup: "Supabase ще не налаштовано.",
    schemaMissing:
      "Таблицю analytics_events ще не створено. Запустіть оновлений schema.sql у Supabase.",
    analytics: "Аналітика",
    media: "Media KPI",
    registrations: "Перевірка бізнесів",
    users: "Користувачі",
    prospects: "Prospects",
    addProspect: "Додати prospect",
    publishedBusinesses: "Опубліковані бізнеси",
    onlineBusinesses: "Online / all-Canada",
    trackedDemand: "Пошуковий попит",
    zeroResults: "Zero-results",
    priorityGaps: "Пріоритетні gaps",
    coveredCells: "Покриті комірки",
    last30: "Останні 30 днів",
    priorityTitle: "Найважливіші gaps",
    priorityIntro:
      "Починайте з цих міст і категорій: там є сигнали попиту або zero-results, але локальної пропозиції недостатньо.",
    cityOverview: "Огляд по містах",
    matrixTitle: "Матриця покриття",
    matrixIntro:
      "У кожній комірці: локальні бізнеси, all-Canada бізнеси для цієї категорії та пошуковий попит.",
    city: "Місто",
    local: "Локальні",
    online: "online",
    demand: "попит",
    searches: "пошуки",
    gaps: "gaps",
    noData: "Даних поки недостатньо.",
    openSearch: "Відкрити пошук",
    legendGap: "Gap",
    legendThin: "Thin",
    legendCovered: "Covered",
    legendGapText: "0 локальних бізнесів, але є пошуковий попит або zero-results.",
    legendThinText:
      "1-2 локальні бізнеси, або є попит, який виправдовує додатковий outreach.",
    legendCoveredText: "3+ локальні бізнеси у цьому місті та категорії.",
  },
  en: {
    kicker: "Admin",
    title: "City-category coverage matrix",
    intro:
      "Shows where Kolo has enough businesses and where search demand exists with few or zero local results.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to the coverage matrix.",
    setup: "Supabase is not configured yet.",
    schemaMissing:
      "The analytics_events table has not been created yet. Run the updated schema.sql in Supabase.",
    analytics: "Analytics",
    media: "Media KPI",
    registrations: "Business review",
    users: "Users",
    prospects: "Prospects",
    addProspect: "Add prospect",
    publishedBusinesses: "Published businesses",
    onlineBusinesses: "Online / all-Canada",
    trackedDemand: "Search demand",
    zeroResults: "Zero-results",
    priorityGaps: "Priority gaps",
    coveredCells: "Covered cells",
    last30: "Last 30 days",
    priorityTitle: "Highest-priority gaps",
    priorityIntro:
      "Start with these cities and categories: they show demand or zero-results, but not enough local supply.",
    cityOverview: "City overview",
    matrixTitle: "Coverage matrix",
    matrixIntro:
      "Each cell shows local businesses, all-Canada businesses for that category, and search demand.",
    city: "City",
    local: "Local",
    online: "online",
    demand: "demand",
    searches: "searches",
    gaps: "gaps",
    noData: "Not enough data yet.",
    openSearch: "Open search",
    legendGap: "Gap",
    legendThin: "Thin",
    legendCovered: "Covered",
    legendGapText: "0 local businesses with search demand or zero-results.",
    legendThinText:
      "1-2 local businesses, or enough demand to justify more outreach.",
    legendCoveredText: "3+ local businesses in that city/category.",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AdminCoveragePage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let businesses: BusinessRow[] = [];
  let events: AnalyticsEventRow[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const since = new Date(Date.now() - 30 * dayInMs).toISOString();
    const [businessesResult, eventsResult] = await Promise.all([
      supabase
        .from("businesses")
        .select("category_slug, city, serves_all_canada, status")
        .eq("status", "published"),
      supabase
        .from("analytics_events")
        .select("event_type, city, category_slug")
        .gte("occurred_at", since)
        .in("event_type", ["search", "search_zero_results"])
        .limit(10000),
    ]);

    businesses = (businessesResult.data ?? []) as BusinessRow[];
    events = (eventsResult.data ?? []) as AnalyticsEventRow[];
    errorMessage =
      eventsResult.error && isAnalyticsSchemaError(eventsResult.error.message)
        ? labels.schemaMissing
        : eventsResult.error?.message || businessesResult.error?.message || "";
  }

  if (!isSupabaseConfigured()) {
    return <StatusCard text={labels.setup} />;
  }

  if (!user) {
    return (
      <StatusCard text={labels.noAccess}>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value="/admin/coverage" />
          <Button type="submit">{labels.signIn}</Button>
        </form>
      </StatusCard>
    );
  }

  if (!isAdmin) {
    return <StatusCard text={labels.noAccess} />;
  }

  const localizedCategories = localizeCategories(categories, locale);
  const coverage = getCoverageData(businesses, events, locale);
  const summary = getCoverageSummary(coverage.rows, businesses);
  const priorityGaps = coverage.cells
    .filter((cell) => cell.status === "gap" || cell.status === "thin")
    .filter((cell) => cell.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 12);

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
            <Link href="/admin/media">
              <RadioTower className="h-4 w-4" />
              {labels.media}
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
          <Button asChild variant="outline">
            <Link href="/admin/prospects">
              <ClipboardList className="h-4 w-4" />
              {labels.prospects}
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
          Icon={Building2}
          label={labels.publishedBusinesses}
          value={summary.localBusinesses}
        />
        <MetricCard
          Icon={RadioTower}
          label={labels.onlineBusinesses}
          value={summary.onlineBusinesses}
        />
        <MetricCard
          Icon={Search}
          label={labels.trackedDemand}
          value={summary.searchDemand}
        />
        <MetricCard
          Icon={AlertTriangle}
          label={labels.zeroResults}
          value={summary.zeroResults}
        />
        <MetricCard
          Icon={Target}
          label={labels.priorityGaps}
          value={summary.priorityGaps}
        />
        <MetricCard
          Icon={Grid3X3}
          label={labels.coveredCells}
          value={summary.coveredCells}
        />
      </section>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">{labels.priorityTitle}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {labels.priorityIntro}
              </p>
            </div>
            <Badge variant="outline">{labels.last30}</Badge>
          </div>

          {priorityGaps.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {priorityGaps.map((cell) => (
                <PriorityGapCard
                  cell={cell}
                  key={`${cell.citySlug}-${cell.categorySlug}`}
                  labels={labels}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-md border bg-muted/30 p-4 text-sm font-semibold text-muted-foreground">
              {labels.noData}
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <CityOverviewCard labels={labels} rows={coverage.rows} />
        <CoverageLegend labels={labels} />
      </section>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-5">
            <h2 className="text-2xl font-black">{labels.matrixTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {labels.matrixIntro}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1900px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky left-0 z-10 w-40 bg-muted px-4 py-3 text-left text-xs font-black uppercase tracking-normal text-muted-foreground">
                    {labels.city}
                  </th>
                  {localizedCategories.map((category) => (
                    <th
                      className="min-w-32 px-3 py-3 text-left text-xs font-black uppercase tracking-normal text-muted-foreground"
                      key={category.slug}
                    >
                      {category.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverage.rows.map((row) => (
                  <tr className="border-b last:border-0" key={row.citySlug}>
                    <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left align-top">
                      <p className="font-black">{row.cityLabel}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {row.localSupply} {labels.local} · {row.demand}{" "}
                        {labels.demand}
                      </p>
                    </th>
                    {row.cells.map((cell) => (
                      <td
                        className="px-2 py-3 align-top"
                        key={`${cell.citySlug}-${cell.categorySlug}`}
                      >
                        <CoverageCellLink cell={cell} labels={labels} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-5 text-3xl font-black">{formatNumber(value)}</p>
        <p className="mt-3 text-sm font-bold text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function PriorityGapCard({
  cell,
  labels,
}: {
  cell: CoverageCell;
  labels: (typeof text)["uk"];
}) {
  return (
    <div
      className={`rounded-md border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${getCellClassName(
        cell.status,
      )}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{cell.categoryLabel}</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {cell.cityLabel}
          </p>
        </div>
        <Badge>{cell.score}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label={labels.local} value={cell.localSupply} />
        <MiniStat label={labels.online} value={cell.nationalSupply} />
        <MiniStat
          label={labels.searches}
          value={cell.searchCount + cell.zeroResultCount}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/${cell.citySlug}/${cell.categorySlug}`}>
            <ExternalLink className="h-4 w-4" />
            {labels.openSearch}
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link
            href={`/admin/prospects?city=${cell.citySlug}&category=${cell.categorySlug}`}
          >
            <ClipboardList className="h-4 w-4" />
            {labels.addProspect}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CityOverviewCard({
  labels,
  rows,
}: {
  labels: (typeof text)["uk"];
  rows: CityCoverageRow[];
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-2xl font-black">{labels.cityOverview}</h2>
        <div className="mt-5 grid gap-3">
          {rows.map((row) => (
            <div
              className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
              key={row.citySlug}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{row.cityLabel}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {row.priorityGaps} {labels.gaps}
                </p>
              </div>
              <MiniStat label={labels.local} value={row.localSupply} />
              <MiniStat label={labels.demand} value={row.demand} />
              <MiniStat label={labels.zeroResults} value={row.zeroResultCount} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CoverageLegend({ labels }: { labels: (typeof text)["uk"] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-2xl font-black">{labels.matrixTitle}</h2>
        <div className="mt-5 grid gap-3">
          <LegendItem
            className={getCellClassName("gap")}
            label={labels.legendGap}
            text={labels.legendGapText}
          />
          <LegendItem
            className={getCellClassName("thin")}
            label={labels.legendThin}
            text={labels.legendThinText}
          />
          <LegendItem
            className={getCellClassName("covered")}
            label={labels.legendCovered}
            text={labels.legendCoveredText}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendItem({
  className,
  label,
  text,
}: {
  className: string;
  label: string;
  text: string;
}) {
  return (
    <div className={`rounded-md border p-4 ${className}`}>
      <p className="font-black">{label}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function CoverageCellLink({
  cell,
  labels,
}: {
  cell: CoverageCell;
  labels: (typeof text)["uk"];
}) {
  return (
    <Link
      aria-label={`${labels.openSearch}: ${cell.cityLabel} ${cell.categoryLabel}`}
      className={`block min-h-24 rounded-md border p-2 transition hover:-translate-y-0.5 hover:shadow-soft ${getCellClassName(
        cell.status,
      )}`}
      href={`/${cell.citySlug}/${cell.categorySlug}`}
    >
      <p className="text-lg font-black">{cell.localSupply}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-normal text-muted-foreground">
        {cell.nationalSupply ? `+${cell.nationalSupply} ${labels.online}` : " "}
      </p>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {cell.searchCount + cell.zeroResultCount} {labels.demand}
      </p>
    </Link>
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

function getCoverageData(
  businesses: BusinessRow[],
  events: AnalyticsEventRow[],
  locale: Locale,
) {
  const localSupply = new Map<string, number>();
  const nationalSupply = new Map<string, number>();
  const searchDemand = new Map<string, { searches: number; zeroResults: number }>();
  const knownCategorySlugs = new Set(categories.map((category) => category.slug));

  for (const business of businesses) {
    const categorySlug = normalizeCategorySlug(business.category_slug);

    if (!knownCategorySlugs.has(categorySlug)) {
      continue;
    }

    if (business.serves_all_canada) {
      incrementCount(nationalSupply, categorySlug);
      continue;
    }

    const citySlug = resolveCitySlug(business.city);

    if (citySlug) {
      incrementCount(localSupply, getCoverageKey(citySlug, categorySlug));
    }
  }

  for (const event of events) {
    const categorySlug = normalizeCategorySlug(event.category_slug);
    const citySlug = resolveCitySlug(event.city);

    if (!citySlug || !knownCategorySlugs.has(categorySlug)) {
      continue;
    }

    const key = getCoverageKey(citySlug, categorySlug);
    const demand = searchDemand.get(key) ?? { searches: 0, zeroResults: 0 };

    if (event.event_type === "search_zero_results") {
      demand.zeroResults += 1;
    } else {
      demand.searches += 1;
    }

    searchDemand.set(key, demand);
  }

  const cells = cities.flatMap((city) =>
    categories.map((category) => {
      const key = getCoverageKey(city.slug, category.slug);
      const demand = searchDemand.get(key) ?? { searches: 0, zeroResults: 0 };
      const localCount = localSupply.get(key) ?? 0;
      const nationalCount = nationalSupply.get(category.slug) ?? 0;
      const status = getCoverageStatus(
        localCount,
        nationalCount,
        demand.searches,
        demand.zeroResults,
      );
      const localizedCity = localizeCity(city, locale);
      const localizedCategory = localizeCategory(category, locale);

      return {
        categoryLabel: localizedCategory.name,
        categorySlug: category.slug,
        cityLabel: localizedCity.name,
        citySlug: city.slug,
        localSupply: localCount,
        nationalSupply: nationalCount,
        score: getCoverageScore(
          localCount,
          nationalCount,
          demand.searches,
          demand.zeroResults,
        ),
        searchCount: demand.searches,
        status,
        zeroResultCount: demand.zeroResults,
      };
    }),
  );

  return {
    cells,
    rows: cities.map((city) => {
      const cityCells = cells.filter((cell) => cell.citySlug === city.slug);
      const localizedCity = localizeCity(city, locale);

      return {
        cells: cityCells,
        cityLabel: localizedCity.name,
        citySlug: city.slug,
        demand: cityCells.reduce(
          (total, cell) => total + cell.searchCount + cell.zeroResultCount,
          0,
        ),
        localSupply: cityCells.reduce(
          (total, cell) => total + cell.localSupply,
          0,
        ),
        priorityGaps: cityCells.filter(
          (cell) =>
            cell.score > 0 &&
            (cell.status === "gap" || cell.status === "thin"),
        ).length,
        zeroResultCount: cityCells.reduce(
          (total, cell) => total + cell.zeroResultCount,
          0,
        ),
      };
    }),
  };
}

function getCoverageSummary(
  rows: CityCoverageRow[],
  businesses: BusinessRow[],
) {
  const cells = rows.flatMap((row) => row.cells);

  return {
    coveredCells: cells.filter((cell) => cell.status === "covered").length,
    localBusinesses: businesses.filter(
      (business) => !business.serves_all_canada,
    ).length,
    onlineBusinesses: businesses.filter((business) => business.serves_all_canada)
      .length,
    priorityGaps: cells.filter(
      (cell) =>
        cell.score > 0 && (cell.status === "gap" || cell.status === "thin"),
    ).length,
    searchDemand: cells.reduce(
      (total, cell) => total + cell.searchCount + cell.zeroResultCount,
      0,
    ),
    zeroResults: cells.reduce((total, cell) => total + cell.zeroResultCount, 0),
  };
}

function getCoverageStatus(
  localSupply: number,
  nationalSupply: number,
  searches: number,
  zeroResults: number,
): CoverageCell["status"] {
  const demand = searches + zeroResults;

  if (localSupply >= 3) {
    return "covered";
  }

  if (localSupply === 0 && demand > 0) {
    return "gap";
  }

  if (localSupply < 3 && demand > 0) {
    return "thin";
  }

  return localSupply > 0 || nationalSupply > 0 ? "thin" : "empty";
}

function getCoverageScore(
  localSupply: number,
  nationalSupply: number,
  searches: number,
  zeroResults: number,
) {
  const supplyGap = localSupply === 0 ? 18 : localSupply === 1 ? 10 : 5;
  const onlineOffset = nationalSupply > 0 && localSupply === 0 ? -3 : 0;
  const demand = searches + zeroResults;

  if (demand === 0) {
    return 0;
  }

  return Math.max(
    0,
    zeroResults * 8 + searches * 3 + supplyGap + onlineOffset,
  );
}

function getCoverageKey(citySlug: string, categorySlug: string) {
  return `${citySlug}:${categorySlug}`;
}

function incrementCount(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function resolveCitySlug(value: string | null | undefined) {
  const resolvedCity = value
    ? resolveCityFromLocationInput(cities, value)?.city
    : undefined;

  return resolvedCity?.slug;
}

function normalizeCategorySlug(value: string | null | undefined) {
  const normalizedSlug = value?.trim().toLowerCase();

  if (!normalizedSlug || normalizedSlug === "others") {
    return "other";
  }

  const category = getCategory(normalizedSlug);

  return category?.slug ?? normalizedSlug;
}

function getCellClassName(status: CoverageCell["status"]) {
  if (status === "gap") {
    return "border-destructive/30 bg-destructive/10";
  }

  if (status === "thin") {
    return "border-amber-500/30 bg-amber-500/10";
  }

  if (status === "covered") {
    return "border-primary/25 bg-primary/10";
  }

  return "border-border bg-muted/20";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-CA").format(value);
}

function isAnalyticsSchemaError(message: string) {
  return (
    message.includes("analytics_events") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("Could not find"))
  );
}
