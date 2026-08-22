import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { BusinessCard } from "@/components/business-card";
import { BusinessContentTiles } from "@/components/business-content-cards";
import { ContactAccessCard } from "@/components/contact-access-card";
import { ResultsMap } from "@/components/results-map";
import { SearchLauncher } from "@/components/search-launcher";
import { SearchLocationAutoFilter } from "@/components/search-location-auto-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categories, cities, getCategory, getCity } from "@/lib/data";
import {
  getDirectoryBusinesses,
  searchDirectoryBusinesses,
} from "@/lib/directory-data";
import {
  copy,
  localizeBusinesses,
  localizeCategories,
  localizeCities,
  localizeCategory,
  localizeCity,
  type Locale,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { Business } from "@/lib/types";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    category?: string;
    near?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    localOnly?: string;
    locationReady?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Search",
  description: "Search Ukrainian-owned businesses across Canada on Kolo.",
};

const text = {
  uk: {
    kicker: "Пошук",
    title: "Результати пошуку",
    allCategories: "Усі категорії",
    allCities: "Усі міста",
    noResults: "Нічого не знайдено",
    noResultsText:
      "Спробуйте змінити ключове слово, локацію або категорію.",
    discoverTitle: "Огляд",
    discoverText:
      "Пости, події, послуги й продукти від українських бізнесів у Kolo.",
    searchBusinessTitle: "Знайти бізнес",
    detectingLocation: "Підбираємо локальні результати...",
    detectingLocationText:
      "Визначаємо вашу локацію, щоб не показувати випадкові бізнеси перед першим локальним пошуком.",
    clear: "Очистити пошук",
    summary: (count: number, city: string, category: string) =>
      `${count} результатів · ${city} · ${category}`,
    nearSummary: (count: number, place: string, category: string) =>
      `${count} результатів · біля ${place} · ${category}`,
  },
  en: {
    kicker: "Search",
    title: "Search results",
    allCategories: "All categories",
    allCities: "All cities",
    noResults: "No results found",
    noResultsText:
      "Try changing the keyword, location, or category.",
    discoverTitle: "Explore",
    discoverText:
      "Posts, events, services, and products from Ukrainian businesses on Kolo.",
    searchBusinessTitle: "Find a business",
    detectingLocation: "Finding local results...",
    detectingLocationText:
      "We are checking your location first, so broad results do not flash before the local search is ready.",
    clear: "Clear search",
    summary: (count: number, city: string, category: string) =>
      `${count} result${count === 1 ? "" : "s"} · ${city} · ${category}`,
    nearSummary: (count: number, place: string, category: string) =>
      `${count} result${count === 1 ? "" : "s"} · near ${place} · ${category}`,
  },
} satisfies Record<Locale, Record<string, string | ((...args: never[]) => string)>>;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const commonLabels = copy[locale];
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = resolvedSearchParams.q;
  const citySlug = resolvedSearchParams.city;
  const categorySlug = resolvedSearchParams.category;
  const near = resolvedSearchParams.near?.trim();
  const latitude = Number(resolvedSearchParams.lat);
  const longitude = Number(resolvedSearchParams.lng);
  const radiusInKm = Number(resolvedSearchParams.radius) || 75;
  const localOnly = resolvedSearchParams.localOnly === "1";
  const locationReady = resolvedSearchParams.locationReady === "1";
  const coordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : undefined;
  const shouldShowDiscovery =
    !query &&
    !citySlug &&
    !categorySlug &&
    !near &&
    !coordinates &&
    !localOnly &&
    !locationReady;
  const shouldAutoDetectLocation =
    !shouldShowDiscovery && !citySlug && !near && !coordinates && !locationReady;
  const city = citySlug ? getCity(citySlug) : undefined;
  const category = categorySlug ? getCategory(categorySlug) : undefined;
  const user = await getCurrentUser();
  const canViewContacts = Boolean(user);
  const nextParams = new URLSearchParams();

  if (query) {
    nextParams.set("q", query);
  }

  if (citySlug) {
    nextParams.set("city", citySlug);
  }

  if (categorySlug) {
    nextParams.set("category", categorySlug);
  }

  if (near) {
    nextParams.set("near", near);
  }

  if (resolvedSearchParams.lat) {
    nextParams.set("lat", resolvedSearchParams.lat);
  }

  if (resolvedSearchParams.lng) {
    nextParams.set("lng", resolvedSearchParams.lng);
  }

  if (resolvedSearchParams.radius) {
    nextParams.set("radius", resolvedSearchParams.radius);
  }

  if (localOnly) {
    nextParams.set("localOnly", "1");
  }

  const nextPath = `/search${nextParams.size ? `?${nextParams.toString()}` : ""}`;
  const localizedCities = localizeCities(cities, locale).map((cityOption) => ({
    ...cityOption,
    summary: "",
  }));
  const localizedCategories = localizeCategories(categories, locale);
  const localizedCity = city ? localizeCity(city, locale) : undefined;
  const localizedCategory = category
    ? localizeCategory(category, locale)
    : undefined;
  const results = shouldAutoDetectLocation
    ? []
    : await searchDirectoryBusinesses({
        query,
        citySlug: coordinates ? undefined : city?.slug,
        categorySlug: category?.slug,
        coordinates,
        currentUserId: user?.id,
        localOnly,
        radiusInKm,
      });
  const discoveryBusinesses = shouldShowDiscovery
    ? await getDirectoryBusinesses(user?.id, { includeContentItems: true })
    : [];
  const localizedResults = localizeBusinesses(results, locale);
  const localizedDiscoveryBusinesses = localizeBusinesses(
    discoveryBusinesses,
    locale,
  );
  const discoveryEntries = getDiscoveryEntries(localizedDiscoveryBusinesses);
  const mapResults = localizedResults.map(({ address, id, name, slug }) => ({
    address,
    id,
    name,
    slug,
  }));
  const summary = labels.summary as (
    count: number,
    city: string,
    category: string,
  ) => string;
  const nearSummary = labels.nearSummary as (
    count: number,
    place: string,
    category: string,
  ) => string;
  const summaryText = shouldAutoDetectLocation
    ? (labels.detectingLocation as string)
    : shouldShowDiscovery
      ? (labels.discoverText as string)
    : near && coordinates
      ? nearSummary(
          localizedResults.length,
          near,
          localizedCategory?.name ?? (labels.allCategories as string),
        )
      : summary(
          localizedResults.length,
          localizedCity?.name ?? (labels.allCities as string),
          localizedCategory?.name ?? (labels.allCategories as string),
        );

  return (
    <div className="bg-background">
      <SearchLocationAutoFilter
        categories={categorySlug}
        cities={cities}
        enabled={shouldAutoDetectLocation}
        locale={locale}
        localOnly={localOnly}
        query={query}
        radius={resolvedSearchParams.radius}
      />
      <section className="sticky top-16 z-30 border-b bg-background/95 py-2 backdrop-blur-xl">
        <div className="container flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0 sm:max-w-xs md:max-w-sm lg:max-w-md">
              <Badge variant="accent" className="hidden sm:inline-flex">
                {labels.kicker as string}
              </Badge>
              <h1 className="mt-0 truncate text-xl font-black tracking-normal sm:mt-2 md:text-2xl">
                {shouldShowDiscovery
                  ? (labels.discoverTitle as string)
                  : (labels.title as string)}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                {summaryText}
              </p>
            </div>
          </div>
          <div className="min-w-0 sm:w-[min(42vw,28rem)]">
            <SearchLauncher
              categories={localizedCategories}
              cities={localizedCities}
              defaultCity={city?.slug}
              defaultCategory={category?.slug ?? "all"}
              defaultCoordinates={coordinates}
              defaultLocalOnly={localOnly}
              defaultLocation={near}
              defaultQuery={query}
              locale={locale}
            />
          </div>
        </div>
      </section>

      <section
        className={
          shouldShowDiscovery
            ? "container py-8"
            : "container grid gap-6 py-8 lg:grid-cols-[1fr_400px]"
        }
      >
        <div>
          {shouldShowDiscovery ? (
            discoveryEntries.length ? (
              <BusinessContentTiles
                canViewContacts={canViewContacts}
                entries={discoveryEntries}
                labels={getBusinessContentLabels(locale)}
                locale={locale}
                nextPath={nextPath}
              />
            ) : (
              <SearchLoadingState
                title={labels.discoverTitle as string}
                text={labels.discoverText as string}
              />
            )
          ) : shouldAutoDetectLocation ? (
            <SearchLoadingState
              title={labels.detectingLocation as string}
              text={labels.detectingLocationText as string}
            />
          ) : localizedResults.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {localizedResults.map((business, index) => (
                <BusinessCard
                  key={business.slug}
                  business={business}
                  canViewContacts={canViewContacts}
                  priority={index < 2}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Search className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-bold">
                {labels.noResults as string}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {labels.noResultsText as string}
              </p>
              <Button asChild className="mt-5" variant="outline">
                <Link href="/search">{labels.clear as string}</Link>
              </Button>
            </div>
          )}
        </div>
        {shouldShowDiscovery ? null : (
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-lg border border-white/70 bg-card shadow-lift dark:border-white/10">
            {shouldAutoDetectLocation ? (
              <div className="grid min-h-[520px] place-items-center bg-muted/40 p-6">
                <Skeleton className="h-80 w-full rounded-lg" />
              </div>
            ) : canViewContacts ? (
              <ResultsMap
                businesses={mapResults}
                title={commonLabels.explore.mapPreview}
                labels={{
                  mapPreview: commonLabels.explore.mapPreview,
                  noAddresses: commonLabels.explore.mapNoAddresses,
                  showing: commonLabels.explore.mapShowing,
                  openInMaps: commonLabels.explore.openInMaps,
                }}
              />
            ) : (
              <div className="grid min-h-[520px] place-items-center bg-muted/60 p-6">
                <ContactAccessCard
                  className="max-w-sm"
                  locale={locale}
                  nextPath={nextPath}
                  tone="map"
                />
              </div>
            )}
          </div>
        </aside>
        )}
      </section>
    </div>
  );
}

function SearchLoadingState({
  text,
  title,
}: {
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-8">
      <Search className="h-10 w-10 text-primary" />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {text}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

function getDiscoveryEntries(businesses: Business[]) {
  return businesses
    .flatMap((business) =>
      (business.contentItems ?? []).map((item) => ({
        business,
        item,
      })),
    )
    .sort(
      (firstEntry, secondEntry) =>
        getContentTime(secondEntry.item) - getContentTime(firstEntry.item),
    )
    .slice(0, 80);
}

function getContentTime(item: NonNullable<Business["contentItems"]>[number]) {
  const value = item?.updatedAt || item?.createdAt;
  const time = value ? new Date(value).getTime() : 0;

  return Number.isFinite(time) ? time : 0;
}

function getBusinessContentLabels(locale: Locale) {
  return locale === "uk"
    ? {
        contactSignInText:
          "Контакти, локацію та посилання видно лише після входу.",
        contactSignInTitle: "Увійдіть, щоб побачити контакти",
        service: "Послуга",
        event: "Подія",
        product: "Продукт",
        available: "В наявності",
        outOfStock: "Немає в наявності",
        free: "Безкоштовно",
        link: "Посилання",
        online: "Онлайн",
        signIn: "Увійти",
        businessContacts: "Контакти бізнесу",
      }
    : {
        contactSignInText:
          "Contacts, location, and external links are visible after sign-in.",
        contactSignInTitle: "Sign in to view contacts",
        service: "Service",
        event: "Event",
        product: "Product",
        available: "Available",
        outOfStock: "Out of stock",
        free: "Free",
        link: "Link",
        online: "Online",
        signIn: "Sign in",
        businessContacts: "Business contacts",
      };
}
