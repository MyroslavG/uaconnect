"use client";

import { FormEvent, useState } from "react";
import { Search, SlidersHorizontal, Tags } from "lucide-react";
import { useRouter } from "next/navigation";

import { CategoryCombobox } from "@/components/category-combobox";
import { LocationField } from "@/components/location-field";
import type { Category, City } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocodeSearchLocation } from "@/lib/client-geocoding";
import { copy, type Locale } from "@/lib/i18n";
import {
  resolveCityFromLocationInput,
  type Coordinates,
} from "@/lib/location";

type ExploreFiltersProps = {
  cities: City[];
  categories: Category[];
  currentCity: string;
  currentCategory: string;
  query?: string;
  locale: Locale;
};

const filterFieldClass =
  "group grid h-16 grid-cols-[1.125rem_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-3 rounded-md border border-border/70 bg-background/90 px-4 py-3 shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue/35 focus-within:border-primary/55 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10";

const filterLabelClass =
  "col-start-2 row-start-1 truncate text-[10px] font-black uppercase leading-none tracking-[0.16em] text-muted-foreground transition group-focus-within:text-primary";

const filterIconClass =
  "pointer-events-none col-start-1 row-span-2 row-start-1 h-4 w-4 self-center text-primary/70 transition group-focus-within:text-primary";

const filterControlClass =
  "col-start-2 row-start-2 h-6 min-w-0 border-0 bg-transparent p-0 text-sm font-bold leading-6 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/75";

const filterSelectClass =
  "h-6 border-0 bg-transparent p-0 leading-6 shadow-none";

export function ExploreFilters({
  cities,
  categories,
  currentCity,
  currentCategory,
  query = "",
  locale,
}: ExploreFiltersProps) {
  const router = useRouter();
  const labels = copy[locale];
  const currentCityName =
    cities.find((city) => city.slug === currentCity)?.name ?? "";
  const [citySlug, setCitySlug] = useState(currentCity);
  const [location, setLocation] = useState(currentCityName);
  const [locationCoordinates, setLocationCoordinates] = useState<
    Coordinates | undefined
  >();
  const [categorySlug, setCategorySlug] = useState(currentCategory);
  const [searchQuery, setSearchQuery] = useState(query);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const params = new URLSearchParams();

    try {
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const searchLocation = locationCoordinates
        ? {
            label: location.trim() || labels.search.currentLocation,
            coordinates: locationCoordinates,
          }
        : await geocodeSearchLocation(cities, location);
      const locationResolution = resolveCityFromLocationInput(cities, location);

      if (searchLocation && locationResolution?.kind !== "city") {
        params.set("near", searchLocation.label);
        params.set("lat", searchLocation.coordinates.latitude.toFixed(6));
        params.set("lng", searchLocation.coordinates.longitude.toFixed(6));
        params.set("category", categorySlug);
        router.push(`/search?${params}`);
        return;
      }

      if (!searchLocation && location.trim() && !locationResolution) {
        params.set("near", location.trim());
        params.set("category", categorySlug);
        router.push(`/search?${params}`);
        return;
      }

      const nextCitySlug = locationResolution?.city.slug ?? citySlug;

      router.push(
        `/${nextCitySlug}/${categorySlug}${params.size ? `?${params}` : ""}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="premium-panel grid items-stretch gap-2 rounded-lg p-2 md:grid-cols-2 xl:grid-cols-[minmax(250px,1fr)_minmax(320px,1.15fr)_minmax(250px,0.9fr)_auto]"
    >
      <label className={filterFieldClass}>
        <span className={filterLabelClass}>{labels.search.keyword}</span>
        <Search className={filterIconClass} />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={filterControlClass}
          placeholder={labels.search.keywordPlaceholder}
        />
      </label>
      <LocationField
        cities={cities}
        value={location}
        onValueChange={setLocation}
        onCitySlugChange={setCitySlug}
        labels={{
          label: labels.search.location,
          placeholder: labels.search.locationPlaceholder,
          useCurrent: labels.search.useCurrentLocation,
          locating: labels.search.locating,
          unavailable: labels.search.locationUnavailable,
          denied: labels.search.locationDenied,
          currentLocation: labels.search.currentLocation,
          closestCity: labels.search.closestCity,
          citySuggestion: labels.search.citySuggestion,
          nearbySuggestion: labels.search.nearbySuggestion,
        }}
        onCoordinatesChange={setLocationCoordinates}
      />
      <div className={`${filterFieldClass} relative z-20 focus-within:z-[140]`}>
        <span className={filterLabelClass}>{labels.common.category}</span>
        <Tags className={filterIconClass} />
        <CategoryCombobox
          categories={categories}
          value={categorySlug}
          onValueChange={setCategorySlug}
          ariaLabel={labels.search.filterCategory}
          searchPlaceholder={labels.search.categorySearchPlaceholder}
          emptyLabel={labels.search.categoryNoResults}
          className="col-start-2 row-start-2"
          triggerClassName={filterSelectClass}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-16 w-full self-stretch rounded-md px-5 shadow-glow hover:bg-hover-blue hover:text-hover-blue-foreground"
        disabled={isSubmitting}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {labels.common.apply}
      </Button>
    </form>
  );
}
