"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { SearchPanel } from "@/components/search-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { copy, type Locale } from "@/lib/i18n";
import type { Coordinates } from "@/lib/location";
import type { Category, City } from "@/lib/types";
import { cn } from "@/lib/utils";

type SearchLauncherProps = {
  cities: City[];
  categories: Category[];
  defaultCity?: string;
  defaultCategory?: string;
  defaultLocalOnly?: boolean;
  defaultQuery?: string;
  defaultLocation?: string;
  defaultCoordinates?: Coordinates;
  locale: Locale;
  className?: string;
  tone?: "default" | "hero" | "header";
};

export function SearchLauncher({
  cities,
  categories,
  defaultCity,
  defaultCategory,
  defaultLocalOnly,
  defaultQuery,
  defaultLocation,
  defaultCoordinates,
  locale,
  className,
  tone = "default",
}: SearchLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const labels = copy[locale];
  const title = locale === "uk" ? "Пошук бізнесів" : "Search businesses";
  const displayText = getDisplayText({
    categories,
    cities,
    defaultCategory,
    defaultCity,
    defaultLocation,
    defaultQuery,
    fallback: labels.search.placeholder,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "group flex w-full min-w-0 items-center gap-3 rounded-full border border-border/70 bg-card/95 text-left text-sm font-bold text-muted-foreground shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            tone === "hero"
              ? "h-14 px-5 text-base shadow-soft"
              : "h-11 px-4",
            tone === "header" ? "h-10 bg-background/80 text-xs" : "",
            className,
          )}
          type="button"
        >
          <Search className="h-4 w-4 shrink-0 text-primary transition group-hover:text-hover-blue-foreground" />
          <span className="min-w-0 truncate">{displayText}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(86dvh,42rem)] max-w-3xl overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-black tracking-normal">
            {title}
          </DialogTitle>
        </DialogHeader>
        <SearchPanel
          categories={categories}
          cities={cities}
          defaultCategory={defaultCategory}
          defaultCity={defaultCity}
          defaultCoordinates={defaultCoordinates}
          defaultFiltersOpen
          defaultLocalOnly={defaultLocalOnly}
          defaultLocation={defaultLocation}
          defaultQuery={defaultQuery}
          locale={locale}
          onSubmitted={() => setIsOpen(false)}
          variant="compact"
        />
      </DialogContent>
    </Dialog>
  );
}

function getDisplayText({
  categories,
  cities,
  defaultCategory,
  defaultCity,
  defaultLocation,
  defaultQuery,
  fallback,
}: {
  categories: Category[];
  cities: City[];
  defaultCategory?: string;
  defaultCity?: string;
  defaultLocation?: string;
  defaultQuery?: string;
  fallback: string;
}) {
  const parts = [
    defaultQuery?.trim(),
    defaultLocation?.trim() ||
      (defaultCity
        ? cities.find((city) => city.slug === defaultCity)?.name
        : undefined),
    defaultCategory && defaultCategory !== "all"
      ? categories.find((category) => category.slug === defaultCategory)?.name
      : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : fallback;
}
