import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { BusinessCard } from "@/components/business-card";
import { ContactAccessCard } from "@/components/contact-access-card";
import { ResultsMap } from "@/components/results-map";
import { SearchPanel } from "@/components/search-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories, cities, getCategory, getCity } from "@/lib/data";
import { searchDirectoryBusinesses } from "@/lib/directory-data";
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

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    city?: string;
    category?: string;
    near?: string;
    lat?: string;
    lng?: string;
    radius?: string;
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
  const coordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : undefined;
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
  const results = await searchDirectoryBusinesses({
    query,
    citySlug: coordinates ? undefined : city?.slug,
    categorySlug: category?.slug,
    coordinates,
    radiusInKm,
  });
  const localizedResults = localizeBusinesses(results, locale);
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

  return (
    <div className="bg-background">
      <section className="border-b bg-card/50 py-10">
        <div className="container">
          <Badge variant="accent">{labels.kicker as string}</Badge>
          <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
            {labels.title as string}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {near && coordinates
              ? nearSummary(
                  localizedResults.length,
                  near,
                  localizedCategory?.name ?? (labels.allCategories as string),
                )
              : summary(
                  localizedResults.length,
                  localizedCity?.name ?? (labels.allCities as string),
                  localizedCategory?.name ?? (labels.allCategories as string),
                )}
          </p>
          <div className="mt-6">
            <SearchPanel
              cities={localizedCities}
              categories={localizedCategories}
              defaultCity={city?.slug}
              defaultCategory={category?.slug ?? "all"}
              defaultQuery={query}
              defaultLocation={near}
              defaultCoordinates={coordinates}
              variant="compact"
              locale={locale}
            />
          </div>
        </div>
      </section>

      <section className="container grid gap-6 py-8 lg:grid-cols-[1fr_400px]">
        <div>
          {localizedResults.length > 0 ? (
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
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-lg border border-white/70 bg-card shadow-lift dark:border-white/10">
            {canViewContacts ? (
              <ResultsMap
                businesses={localizedResults}
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
      </section>
    </div>
  );
}
