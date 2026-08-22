"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search, SlidersHorizontal, Tags } from "lucide-react";
import { useRouter } from "next/navigation";

import { CategoryCombobox } from "@/components/category-combobox";
import { LocationField } from "@/components/location-field";
import type { Category, City } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocodeSearchLocation } from "@/lib/client-geocoding";
import { copy, type Locale } from "@/lib/i18n";
import type { Coordinates } from "@/lib/location";

type SearchPanelProps = {
  cities: City[];
  categories: Category[];
  variant?: "hero" | "compact";
  defaultFiltersOpen?: boolean;
  defaultCity?: string;
  defaultCategory?: string;
  defaultLocalOnly?: boolean;
  defaultQuery?: string;
  defaultLocation?: string;
  defaultCoordinates?: Coordinates;
  locale: Locale;
  onSubmitted?: () => void;
};

const fieldShellClass =
  "group grid h-16 min-w-0 grid-cols-[1.125rem_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-3 rounded-md border border-border/70 bg-background/90 px-4 py-3 shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue/35 focus-within:border-primary/55 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10";

const fieldLabelClass =
  "col-start-2 row-start-1 truncate text-[10px] font-black uppercase leading-none tracking-[0.16em] text-muted-foreground transition group-focus-within:text-primary";

const fieldIconClass =
  "pointer-events-none col-start-1 row-span-2 row-start-1 h-4 w-4 self-center text-primary/70 transition group-focus-within:text-primary";

const fieldControlClass =
  "col-start-2 row-start-2 h-6 min-w-0 border-0 bg-transparent p-0 text-sm font-bold leading-6 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/75";

const selectTriggerClass =
  "h-6 border-0 bg-transparent p-0 leading-6 shadow-none";

const submitButtonClass =
  "h-16 w-full self-stretch rounded-md px-5 shadow-glow hover:bg-hover-blue hover:text-hover-blue-foreground";

export function SearchPanel({
  cities,
  categories,
  variant = "hero",
  defaultFiltersOpen = false,
  defaultCity,
  defaultCategory,
  defaultLocalOnly = false,
  defaultQuery = "",
  defaultLocation,
  defaultCoordinates,
  locale,
  onSubmitted,
}: SearchPanelProps) {
  const router = useRouter();
  const labels = copy[locale];
  const filtersLabel = locale === "uk" ? "Фільтри" : "Filters";
  const initialCitySlug = defaultCity ?? "";
  const initialCityName = defaultCity
    ? cities.find((city) => city.slug === initialCitySlug)?.name ?? ""
    : "";
  const [query, setQuery] = useState(defaultQuery);
  const [location, setLocation] = useState(defaultLocation ?? initialCityName);
  const [locationCoordinates, setLocationCoordinates] = useState<
    Coordinates | undefined
  >(defaultCoordinates);
  const [citySlug, setCitySlug] = useState(initialCitySlug);
  const [categorySlug, setCategorySlug] = useState(
    defaultCategory ?? "all",
  );
  const [localOnly, setLocalOnly] = useState(defaultLocalOnly);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areFiltersOpen, setAreFiltersOpen] = useState(
    variant !== "compact" || defaultFiltersOpen,
  );
  const isCompact = variant === "compact";

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    setCategorySlug(defaultCategory ?? "all");
  }, [defaultCategory]);

  useEffect(() => {
    setLocalOnly(defaultLocalOnly);
  }, [defaultLocalOnly]);

  useEffect(() => {
    setAreFiltersOpen(variant !== "compact" || defaultFiltersOpen);
  }, [variant, defaultFiltersOpen]);

  useEffect(() => {
    const nextCitySlug = defaultCity ?? "";
    const nextCityName = defaultCity
      ? cities.find((city) => city.slug === nextCitySlug)?.name ?? ""
      : "";

    setCitySlug(nextCitySlug);
    setLocation(defaultLocation ?? nextCityName);
    setLocationCoordinates(defaultCoordinates);
  }, [cities, defaultCity, defaultLocation, defaultCoordinates]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const params = new URLSearchParams();

    try {
      if (query.trim()) {
        params.set("q", query.trim());
      }

      const searchLocation = locationCoordinates
        ? {
            label: location.trim() || labels.search.currentLocation,
            coordinates: locationCoordinates,
          }
        : await geocodeSearchLocation(cities, location);

      if (searchLocation) {
        params.set("near", searchLocation.label);
        params.set("lat", searchLocation.coordinates.latitude.toFixed(6));
        params.set("lng", searchLocation.coordinates.longitude.toFixed(6));
      } else if (location.trim()) {
        params.set("near", location.trim());
      } else if (!location.trim() && citySlug) {
        params.set("city", citySlug);
      }

      if (categorySlug !== "all") {
        params.set("category", categorySlug);
      }

      if (localOnly) {
        params.set("localOnly", "1");
      }

      router.push(`/search${params.size ? `?${params}` : ""}`);
      onSubmitted?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  const advancedFilters = (
    <>
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
        autoDetect={!defaultCity && !defaultLocation}
      />
      <div className={`${fieldShellClass} relative z-20 focus-within:z-[140]`}>
        <span className={fieldLabelClass}>{labels.common.category}</span>
        <Tags className={fieldIconClass} />
        <CategoryCombobox
          categories={categories}
          value={categorySlug}
          onValueChange={setCategorySlug}
          allLabel={labels.search.allCategories}
          ariaLabel={labels.search.selectCategory}
          searchPlaceholder={labels.search.categorySearchPlaceholder}
          emptyLabel={labels.search.categoryNoResults}
          className="col-start-2 row-start-2"
          triggerClassName={selectTriggerClass}
        />
      </div>
      <label className="group flex h-16 min-w-0 cursor-pointer items-center gap-3 rounded-md border border-border/70 bg-background/90 px-4 py-3 text-sm font-black shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue/35">
        <input
          checked={localOnly}
          className="h-4 w-4 accent-primary"
          onChange={(event) => setLocalOnly(event.target.checked)}
          type="checkbox"
        />
        <span className="leading-tight">{labels.search.localOnly}</span>
      </label>
    </>
  );

  if (isCompact) {
    return (
      <form onSubmit={handleSubmit} className="grid w-full max-w-full gap-2">
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_4rem_auto] md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className={fieldShellClass}>
            <span className={fieldLabelClass}>{labels.search.label}</span>
            <Search className={fieldIconClass} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={fieldControlClass}
              placeholder={labels.search.placeholder}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-16 rounded-md px-4"
            aria-expanded={areFiltersOpen}
            onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">{filtersLabel}</span>
          </Button>
          <Button
            type="submit"
            size="lg"
            className="h-16 rounded-md px-5 shadow-glow hover:bg-hover-blue hover:text-hover-blue-foreground"
            disabled={isSubmitting}
          >
            <Search className="h-4 w-4" />
            {labels.search.submit}
          </Button>
        </div>
        {areFiltersOpen ? (
          <div className="grid min-w-0 items-stretch gap-2 rounded-lg border bg-card/95 p-2 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(240px,1.1fr)_minmax(220px,0.9fr)_minmax(150px,0.62fr)]">
            {advancedFilters}
          </div>
        ) : null}
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="premium-panel grid w-full max-w-full min-w-0 items-stretch gap-2 overflow-visible rounded-lg p-2 text-foreground sm:grid-cols-2"
    >
      <label className={fieldShellClass}>
        <span className={fieldLabelClass}>{labels.search.label}</span>
        <Search className={fieldIconClass} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={fieldControlClass}
          placeholder={labels.search.placeholder}
        />
      </label>
      {advancedFilters}
      <Button
        type="submit"
        size="lg"
        className={submitButtonClass}
        disabled={isSubmitting}
      >
        <Search className="h-4 w-4" />
        {labels.search.submit}
      </Button>
    </form>
  );
}
