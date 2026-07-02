import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessCard } from "@/components/business-card";
import { ExploreFilters } from "@/components/explore-filters";
import { ResultsMap } from "@/components/results-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  categories,
  cities,
  getAllExploreParams,
  getCategory,
  getCity,
  searchBusinesses,
} from "@/lib/data";
import { getDirectoryBusinessesByCityAndCategory } from "@/lib/directory-data";
import {
  copy,
  localizeBusinesses,
  localizeCategories,
  localizeCategory,
  localizeCities,
  localizeCity,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";

type ExplorePageProps = {
  params: Promise<{
    city: string;
    category: string;
  }>;
  searchParams?: Promise<{
    q?: string;
  }>;
};

export function generateStaticParams() {
  return getAllExploreParams();
}

export async function generateMetadata({
  params,
}: ExplorePageProps): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  const locale = await getRequestLocale();
  const labels = copy[locale].explore;
  const city = getCity(citySlug);
  const category = getCategory(categorySlug);

  if (!city || !category) {
    return {
      title: labels.fallbackTitle,
    };
  }

  const localizedCity = localizeCity(city, locale);
  const localizedCategory = localizeCategory(category, locale);

  return {
    title: labels.title(localizedCategory.name, localizedCity.name),
    description: labels.metadataDescription(
      localizedCategory.name,
      localizedCity.name,
      localizedCity.province,
    ),
    alternates: {
      canonical: `/${city.slug}/${category.slug}`,
    },
  };
}

export default async function ExplorePage({
  params,
  searchParams,
}: ExplorePageProps) {
  const { city: citySlug, category: categorySlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = resolvedSearchParams.q;
  const locale = await getRequestLocale();
  const labels = copy[locale];
  const city = getCity(citySlug);
  const category = getCategory(categorySlug);

  if (!city || !category) {
    notFound();
  }

  const localizedCity = localizeCity(city, locale);
  const localizedCategory = localizeCategory(category, locale);
  const localizedCities = localizeCities(cities, locale);
  const filterCities = localizedCities.map((localizedFilterCity) => ({
    ...localizedFilterCity,
    summary: "",
  }));
  const localizedCategories = localizeCategories(categories, locale);
  const baseBusinesses = await getDirectoryBusinessesByCityAndCategory(
    city.slug,
    category.slug,
  );
  const localizedBaseBusinesses = localizeBusinesses(baseBusinesses, locale);
  const exploreBusinesses = searchBusinesses(localizedBaseBusinesses, query);

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(10,12,11,0.96)_0%,rgba(10,12,11,0.78)_55%,rgba(10,12,11,0.45)_100%)]" />
        <div className="container relative py-9 md:py-12">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            <Link href="/" className="hover:text-hover-blue">
              {labels.common.home}
            </Link>
            <span>/</span>
            <span>{localizedCity.name}</span>
            <span>/</span>
            <span>{localizedCategory.name}</span>
          </div>
          <div className="mt-8 max-w-4xl">
            <Badge className="border-accent/30 bg-accent/15 text-accent hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground">
              {labels.explore.badge}
            </Badge>
            <h1 className="mt-4 text-balance text-4xl font-black tracking-normal md:text-6xl">
              {labels.explore.title(localizedCategory.name, localizedCity.name)}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
              {labels.explore.description(localizedCategory.description)}
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-7 mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <ExploreFilters
          cities={filterCities}
          categories={localizedCategories}
          currentCity={city.slug}
          currentCategory={category.slug}
          query={query}
          locale={locale}
        />
      </section>

      <section className="container grid gap-6 pb-10 pt-6 lg:grid-cols-[1fr_400px]">
        <div>
          {exploreBusinesses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {exploreBusinesses.map((business, index) => (
                <BusinessCard
                  key={business.slug}
                  business={business}
                  priority={index < 2}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <h2 className="text-2xl font-bold">{labels.explore.noPlaces}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {labels.explore.noPlacesText}
              </p>
              <Button asChild className="mt-5" variant="outline">
                <Link href={`/${city.slug}/${category.slug}`}>
                  {labels.common.clearSearch}
                </Link>
              </Button>
            </div>
          )}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-lg border border-white/70 bg-card shadow-lift dark:border-white/10">
            <div className="flex items-center justify-between border-b bg-card/95 p-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">
                  {labels.explore.mapPreview}
                </p>
                <p className="text-sm font-bold">
                  {labels.explore.area(localizedCity.name)}
                </p>
              </div>
              <Badge variant="outline">{localizedCategory.name}</Badge>
            </div>
            <ResultsMap
              businesses={exploreBusinesses}
              title={labels.explore.mapTitle(
                localizedCategory.name,
                localizedCity.name,
              )}
              labels={{
                mapPreview: labels.explore.mapPreview,
                noAddresses: labels.explore.mapNoAddresses,
                showing: labels.explore.mapShowing,
                openInMaps: labels.explore.openInMaps,
              }}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
