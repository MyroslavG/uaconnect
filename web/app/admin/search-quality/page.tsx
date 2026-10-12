import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Grid3X3,
  Search,
  SearchCheck,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import {
  AdminKeywordCompletionEditor,
  type KeywordCompletionBusiness,
} from "@/components/admin-keyword-completion-editor";
import {
  AdminSearchQueryRulesEditor,
  type AdminSearchQueryRule,
} from "@/components/admin-search-query-rules-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseBusinessKeywords } from "@/lib/business-keywords";
import { categories, getCategory, getCity } from "@/lib/data";
import {
  localizeCategories,
  localizeCategory,
  localizeCity,
} from "@/lib/i18n";
import {
  ANALYTICS_ALL_CATEGORY,
  ANALYTICS_ALL_LOCATION,
  normalizeAnalyticsCategorySlug,
  normalizeAnalyticsCity,
} from "@/lib/analytics-normalization";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Якість пошуку | Kolo",
  description: "Запити та ключові слова, які потрібно покращити в Kolo.",
};

type BusinessRow = Pick<
  Database["public"]["Tables"]["businesses"]["Row"],
  | "category_slug"
  | "city"
  | "id"
  | "keywords"
  | "name"
  | "slug"
  | "status"
>;

type SearchQualityEvent = Pick<
  Database["public"]["Tables"]["analytics_events"]["Row"],
  | "business_id"
  | "category_slug"
  | "city"
  | "event_type"
  | "metadata"
  | "occurred_at"
  | "platform"
  | "search_query"
  | "session_id"
>;

type SearchQueryRuleRow = Pick<
  Database["public"]["Tables"]["search_query_rules"]["Row"],
  | "aliases"
  | "id"
  | "inferred_category_slugs"
  | "is_enabled"
  | "note"
  | "query"
>;

type QueryQualityRow = {
  businessOpens: number;
  categorySlug: string;
  contactClicks: number;
  city: string;
  displayQuery: string;
  noResultSearches: number;
  platforms: string[];
  saves: number;
  searches: number;
  shares: number;
  variants: string[];
  value: string;
};

type SearchIntent = {
  categorySlug: string;
  city: string;
  displayQuery: string;
  value: string;
  variant: string;
};

const dayInMs = 24 * 60 * 60 * 1000;
const attributionWindowInMs = 30 * 60 * 1000;

export default async function AdminSearchQualityPage() {
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let businesses: BusinessRow[] = [];
  let events: SearchQualityEvent[] = [];
  let searchQueryRules: SearchQueryRuleRow[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const since = new Date(Date.now() - 30 * dayInMs).toISOString();
    const [businessesResult, eventsResult, rulesResult] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, slug, category_slug, city, keywords, status")
        .eq("status", "published")
        .order("name", { ascending: true })
        .limit(2000),
      supabase
        .from("analytics_events")
        .select(
          "event_type, search_query, business_id, city, category_slug, metadata, occurred_at, platform, session_id",
        )
        .gte("occurred_at", since)
        .in("event_type", [
          "search",
          "search_zero_results",
          "business_profile_view",
          "contact_click",
          "save_business",
          "share",
        ])
        .order("occurred_at", { ascending: true })
        .limit(10000),
      supabase
        .from("search_query_rules")
        .select("id, query, aliases, inferred_category_slugs, note, is_enabled")
        .order("updated_at", { ascending: false })
        .limit(250),
    ]);

    businesses = (businessesResult.data ?? []) as BusinessRow[];
    events = (eventsResult.data ?? []) as SearchQualityEvent[];
    searchQueryRules = (rulesResult.data ?? []) as SearchQueryRuleRow[];
    errorMessage = [
      businessesResult.error?.message,
      eventsResult.error?.message,
      rulesResult.error?.message,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (!isSupabaseConfigured()) {
    return <StatusCard text="Supabase ще не налаштовано." />;
  }

  if (!user) {
    return (
      <StatusCard text="Увійдіть, щоб побачити якість пошуку.">
        <form action={signInWithGoogle}>
          <input name="next" type="hidden" value="/admin/search-quality" />
          <Button type="submit">Увійти через Google</Button>
        </form>
      </StatusCard>
    );
  }

  if (!isAdmin) {
    return <StatusCard text="У вас немає доступу до якості пошуку." />;
  }

  const incompleteBusinesses: KeywordCompletionBusiness[] = businesses
    .map((business) => ({
      businessId: business.id,
      category: business.category_slug,
      city: business.city,
      keywordCount: parseBusinessKeywords(business.keywords).length,
      keywords: business.keywords,
      name: business.name,
    }))
    .filter(
      (business) => business.keywordCount < 3 || business.keywordCount > 10,
    )
    .sort((first, second) => first.keywordCount - second.keywordCount);
  const queryRows = getQueryQualityRows(events);
  const weakQueries = queryRows
    .filter(
      (query) =>
        query.searches >= 2 &&
        (query.noResultSearches > 0 || query.businessOpens === 0),
    )
    .sort((first, second) =>
      getWeakQueryScore(second) - getWeakQueryScore(first) ||
      second.searches - first.searches,
    )
    .slice(0, 20);
  const successfulQueries = queryRows
    .filter(
      (query) => getQueryOutcomeCount(query) > 0)
    .sort(
      (first, second) =>
        getQueryOutcomeCount(second) - getQueryOutcomeCount(first) ||
        second.searches - first.searches,
    )
    .slice(0, 20);
  const totalSearches = queryRows.reduce((total, query) => total + query.searches, 0);
  const totalNoResultSearches = queryRows.reduce(
    (total, query) => total + query.noResultSearches,
    0,
  );
  const totalOutcomeEvents = queryRows.reduce(
    (total, query) => total + getQueryOutcomeCount(query),
    0,
  );

  return (
    <main className="container grid gap-8 py-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 w-fit" variant="secondary">
            Адмін
          </Badge>
          <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
            Якість пошуку
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Знаходьте запити без корисного результату, оновлюйте ключові слова та
            перевіряйте, що приводить людей до бізнесів.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4" />
              Аналітика
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/coverage">
              <Grid3X3 className="h-4 w-4" />
              Покриття
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <UsersRound className="h-4 w-4" />
              Користувачі
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
        <Metric icon={<Search />} label="Запити за 30 днів" value={totalSearches} />
        <Metric
          icon={<AlertTriangle />}
          label="Запити без результатів"
          value={totalNoResultSearches}
        />
        <Metric
          icon={<SearchCheck />}
          label="Неповні ключові слова"
          value={incompleteBusinesses.length}
        />
        <Metric
          icon={<BarChart3 />}
          label="Дії після пошуку"
          value={totalOutcomeEvents}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <QualityTable
          empty="Поки що немає повторюваних запитів, які потребують уваги."
          intro="Повторювані пошуки без результатів або без відкриття профілю. Почніть із них: додайте синоніми, уточніть опис чи ключові слова бізнесів."
          rows={weakQueries}
          title="Запити, які треба покращити"
          variant="warning"
        />
        <QualityTable
          empty="Поки що немає зафіксованих дій після пошуку."
          intro="Запити, після яких люди відкривали бізнеси, зберігали їх, ділилися ними або натискали контакти."
          rows={successfulQueries}
          title="Запити, які працюють"
          variant="success"
        />
      </section>

      <Card className="border-white/70 bg-card/95 shadow-sm dark:border-white/10">
        <CardContent className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Search className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-black">Правила запитів</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Перетворюйте популярні слова та синоніми на точніші результати без
                зміни кожного профілю окремо.
              </p>
            </div>
          </div>
          <AdminSearchQueryRulesEditor
            categories={localizeCategories(categories, "uk")}
            rules={searchQueryRules.map(
              (rule): AdminSearchQueryRule => ({
                aliases: rule.aliases,
                id: rule.id,
                inferredCategorySlugs: rule.inferred_category_slugs,
                isEnabled: rule.is_enabled,
                note: rule.note,
                query: rule.query,
              }),
            )}
          />
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-card/95 shadow-sm dark:border-white/10">
        <CardContent className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <SearchCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-black">Ключові слова бізнесів</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Ці профілі мають менше 3 або більше 10 ключових слів. Оновлення тут
                одразу синхронізується з публічним профілем і кабінетом власника.
              </p>
            </div>
          </div>
          <AdminKeywordCompletionEditor businesses={incompleteBusinesses} />
        </CardContent>
      </Card>

      <p className="text-xs leading-5 text-muted-foreground">
        Період: останні 30 днів. Дії після пошуку прив&apos;язуються до останнього
        останнього пошуку в межах 30-хвилинної сесії.
      </p>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-black">{value.toLocaleString("uk-UA")}</p>
          <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QualityTable({
  empty,
  intro,
  rows,
  title,
  variant,
}: {
  empty: string;
  intro: string;
  rows: QueryQualityRow[];
  title: string;
  variant: "success" | "warning";
}) {
  return (
    <Card className={variant === "warning" ? "border-amber-500/30" : undefined}>
      <CardContent className="p-5">
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{intro}</p>
        {rows.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[50rem] text-left text-sm">
              <thead className="border-b text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-4">Запит</th>
                  <th className="pb-2 pr-4">Контекст</th>
                  <th className="pb-2 pr-4">Платформа</th>
                  <th className="pb-2 pr-4 text-right">Пошуки</th>
                  <th className="pb-2 pr-4 text-right">0 результатів</th>
                  <th className="pb-2 pr-4 text-right">Відкриття</th>
                  <th className="pb-2 text-right">Дії</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-b last:border-b-0" key={row.value}>
                    <td className="max-w-48 py-3 pr-4">
                      <p className="truncate font-bold" title={row.displayQuery}>
                        {row.displayQuery}
                      </p>
                      {row.variants.length > 1 ? (
                        <p
                          className="mt-1 truncate text-xs text-muted-foreground"
                          title={row.variants.join(", ")}
                        >
                          Варіанти: {row.variants.join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="max-w-44 py-3 pr-4 text-xs leading-5 text-muted-foreground">
                      {formatSearchContext(row)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {formatPlatforms(row.platforms)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{row.searches}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{row.noResultSearches}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{row.businessOpens}</td>
                    <td className="py-3 text-right tabular-nums">
                      <span title={formatOutcomeBreakdown(row)}>
                        {getQueryOutcomeCount(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({ children, text }: { children?: ReactNode; text: string }) {
  return (
    <main className="container grid min-h-[60vh] place-items-center py-10">
      <Card className="w-full max-w-lg">
        <CardContent className="grid gap-5 p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <p className="text-lg font-bold">{text}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

function getQueryQualityRows(events: SearchQualityEvent[]) {
  const queries = new Map<string, QueryQualityRow>();
  const eventsBySession = new Map<string, SearchQualityEvent[]>();

  for (const event of events) {
    const intent = getSearchIntent(event);

    if (
      (event.event_type === "search" || event.event_type === "search_zero_results") &&
      intent
    ) {
      const row = getOrCreateQuery(queries, intent);
      addUniqueValue(row.platforms, event.platform);
      addUniqueValue(row.variants, intent.variant);

      if (event.event_type === "search") {
        row.searches += 1;
        if (getMetadataNumber(event.metadata, "resultCount") === 0) {
          row.noResultSearches += 1;
        }
      } else {
        row.noResultSearches += 1;
      }
    }

    if (event.session_id) {
      const sessionEvents = eventsBySession.get(event.session_id) ?? [];
      sessionEvents.push(event);
      eventsBySession.set(event.session_id, sessionEvents);
    }
  }

  for (const sessionEvents of eventsBySession.values()) {
    let lastSearch: { occurredAt: number; query: string } | null = null;

    for (const event of sessionEvents) {
      const occurredAt = Date.parse(event.occurred_at);
      const intent = getSearchIntent(event);

      if (event.event_type === "search" && intent && Number.isFinite(occurredAt)) {
        lastSearch = { occurredAt, query: intent.value };
        continue;
      }

      if (!lastSearch || !Number.isFinite(occurredAt)) {
        continue;
      }

      if (occurredAt - lastSearch.occurredAt > attributionWindowInMs) {
        lastSearch = null;
        continue;
      }

      const row = queries.get(lastSearch.query);
      if (!row) {
        continue;
      }

      if (event.event_type === "business_profile_view") {
        row.businessOpens += 1;
      } else if (event.event_type === "contact_click") {
        row.contactClicks += 1;
      } else if (event.event_type === "save_business") {
        row.saves += 1;
      } else if (event.event_type === "share") {
        row.shares += 1;
      }
    }
  }

  return [...queries.values()].filter((query) => query.searches > 0);
}

function getOrCreateQuery(
  queries: Map<string, QueryQualityRow>,
  intent: SearchIntent,
) {
  const existing = queries.get(intent.value);
  if (existing) {
    return existing;
  }

  const next: QueryQualityRow = {
    businessOpens: 0,
    categorySlug: intent.categorySlug,
    contactClicks: 0,
    city: intent.city,
    displayQuery: intent.displayQuery,
    noResultSearches: 0,
    platforms: [],
    saves: 0,
    searches: 0,
    shares: 0,
    variants: [],
    value: intent.value,
  };
  queries.set(intent.value, next);
  return next;
}

function getSearchIntent(event: SearchQualityEvent): SearchIntent | null {
  const query = normalizeSearchQuery(event.search_query);
  const categorySlug = normalizeAnalyticsCategorySlug(
    event.category_slug,
    ANALYTICS_ALL_CATEGORY,
  ) ?? ANALYTICS_ALL_CATEGORY;
  const city = normalizeAnalyticsCity(event.city, ANALYTICS_ALL_LOCATION) ?? ANALYTICS_ALL_LOCATION;

  if (!query && categorySlug === ANALYTICS_ALL_CATEGORY && city === ANALYTICS_ALL_LOCATION) {
    return null;
  }

  const rawQuery = String(event.search_query ?? "").trim();
  const displayQuery = rawQuery || "Пошук за фільтрами";
  const variant = rawQuery || formatSearchContext({ categorySlug, city });

  return {
    categorySlug,
    city,
    displayQuery,
    value: `${query || "filters"}|${categorySlug}|${city}`,
    variant,
  };
}

function normalizeSearchQuery(value: string | null) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function getMetadataNumber(metadata: Json, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata[key];
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getQueryOutcomeCount(query: QueryQualityRow) {
  return query.contactClicks + query.saves + query.shares;
}

function getWeakQueryScore(query: QueryQualityRow) {
  return query.noResultSearches * 4 + (query.businessOpens === 0 ? query.searches : 0);
}

function formatSearchContext({
  categorySlug,
  city,
}: Pick<QueryQualityRow, "categorySlug" | "city">) {
  const segments: string[] = [];
  const category = getCategory(categorySlug);
  const searchCity = getCity(city);

  if (categorySlug !== ANALYTICS_ALL_CATEGORY) {
    segments.push(`Категорія: ${category ? localizeCategory(category, "uk").name : categorySlug}`);
  }
  if (city !== ANALYTICS_ALL_LOCATION) {
    segments.push(`Місто: ${searchCity ? localizeCity(searchCity, "uk").name : city}`);
  }

  return segments.join(" · ") || "Уся Канада · усі категорії";
}

function formatPlatforms(platforms: string[]) {
  return platforms
    .map((platform) => ({ mobile: "Застосунок", web: "Веб" })[platform] ?? platform)
    .join(", ");
}

function formatOutcomeBreakdown(query: QueryQualityRow) {
  return [
    query.contactClicks ? `Контакти: ${query.contactClicks}` : null,
    query.saves ? `Збереження: ${query.saves}` : null,
    query.shares ? `Поширення: ${query.shares}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function addUniqueValue(values: string[], value: string | null) {
  if (value && !values.includes(value)) {
    values.push(value);
  }
}
