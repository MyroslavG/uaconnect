"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LocateFixed, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type Coordinates,
  getNearestCity,
  getLocationSuggestions,
  manualLocationSuggestions,
  resolveCityFromLocationInput,
} from "@/lib/location";
import type { City } from "@/lib/types";

type LocationFieldLabels = {
  label: string;
  placeholder: string;
  useCurrent: string;
  locating: string;
  unavailable: string;
  denied: string;
  currentLocation: string;
  closestCity: (city: string) => string;
  citySuggestion: string;
  nearbySuggestion: (city: string, distance: number) => string;
};

type LocationFieldProps = {
  cities: City[];
  value: string;
  onValueChange: (value: string) => void;
  onCitySlugChange: (slug: string) => void;
  onCoordinatesChange?: (coordinates: Coordinates | undefined) => void;
  autoDetect?: boolean;
  labels: LocationFieldLabels;
};

const fieldShellClass =
  "group grid h-16 min-w-0 grid-cols-[1.125rem_minmax(0,1fr)_2rem] grid-rows-[auto_auto] items-center gap-x-3 rounded-md border border-border/70 bg-background/90 px-4 py-3 shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue/35 focus-within:border-primary/55 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10";

const fieldLabelClass =
  "col-start-2 row-start-1 truncate text-[10px] font-black uppercase leading-none tracking-[0.16em] text-muted-foreground transition group-focus-within:text-primary";

const fieldIconClass =
  "pointer-events-none col-start-1 row-span-2 row-start-1 h-4 w-4 self-center text-primary/70 transition group-focus-within:text-primary";

const fieldControlClass =
  "col-start-2 row-start-2 h-6 min-w-0 border-0 bg-transparent p-0 text-sm font-bold leading-6 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/75";

export function LocationField({
  cities,
  value,
  onValueChange,
  onCitySlugChange,
  onCoordinatesChange,
  autoDetect = false,
  labels,
}: LocationFieldProps) {
  const inputId = useId();
  const suggestionId = `${inputId}-suggestions`;
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const hasAutoDetected = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [status, setStatus] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState({
    left: 16,
    top: 16,
    width: 320,
  });
  const suggestions = useMemo(
    () => getLocationSuggestions(cities, value, 6),
    [cities, value],
  );

  function updateLocation(nextValue: string) {
    onValueChange(nextValue);
    onCoordinatesChange?.(undefined);

    const resolution = resolveCityFromLocationInput(cities, nextValue);

    if (resolution) {
      onCitySlugChange(resolution.city.slug);
      setStatus(
        resolution.kind === "nearby"
          ? labels.closestCity(resolution.city.name)
          : "",
      );
      return;
    }

    onCitySlugChange("");
    setStatus("");
  }

  function selectSuggestion(suggestion: (typeof suggestions)[number]) {
    onValueChange(suggestion.label);
    onCitySlugChange(suggestion.city.slug);
    onCoordinatesChange?.(suggestion.coordinates);
    setStatus(
      suggestion.kind === "nearby"
        ? labels.closestCity(suggestion.city.name)
        : "",
    );
    setIsFocused(false);
  }

  const updateSuggestionsPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const viewportPadding = 16;
    const width = Math.min(
      Math.max(rect.width, 280),
      window.innerWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - width - viewportPadding,
    );

    setSuggestionsPosition({
      left,
      top: rect.bottom + 8,
      width,
    });
  }, []);

  const detectCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus(labels.unavailable);
      return;
    }

    setIsLocating(true);
    setStatus(labels.locating);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const nearestCity = getNearestCity(cities, {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });

        if (nearestCity) {
          onCitySlugChange(nearestCity.slug);
          onValueChange(labels.currentLocation);
          onCoordinatesChange?.(coordinates);
          setStatus(labels.closestCity(nearestCity.name));
        }

        setIsLocating(false);
      },
      () => {
        setStatus(labels.denied);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 8000,
      },
    );
  }, [cities, labels, onCitySlugChange, onCoordinatesChange, onValueChange]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(target)
      ) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!isFocused || suggestions.length === 0) {
      return;
    }

    updateSuggestionsPosition();
    window.addEventListener("resize", updateSuggestionsPosition);
    window.addEventListener("scroll", updateSuggestionsPosition, true);

    return () => {
      window.removeEventListener("resize", updateSuggestionsPosition);
      window.removeEventListener("scroll", updateSuggestionsPosition, true);
    };
  }, [isFocused, suggestions.length, updateSuggestionsPosition]);

  useEffect(() => {
    if (hasAutoDetected.current || !autoDetect || value.trim()) {
      return;
    }

    hasAutoDetected.current = true;
    detectCurrentLocation();
  }, [autoDetect, detectCurrentLocation, value]);

  const suggestionsList =
    isFocused && suggestions.length > 0 ? (
      <div
        ref={suggestionsRef}
        style={{
          left: suggestionsPosition.left,
          top: suggestionsPosition.top,
          width: suggestionsPosition.width,
        }}
        className="fixed z-[9999] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lift"
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => selectSuggestion(suggestion)}
            className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-hover-blue hover:text-hover-blue-foreground"
          >
            <span>
              <span className="block font-bold">{suggestion.label}</span>
              <span className="block text-xs text-muted-foreground">
                {suggestion.kind === "city"
                  ? labels.citySuggestion
                  : labels.nearbySuggestion(
                      suggestion.city.name,
                      suggestion.distanceInKm,
                    )}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-bold">
              {suggestion.city.name}
            </span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className={`${fieldShellClass} relative`}>
      <MapPin className={fieldIconClass} />
      <label htmlFor={inputId} className={fieldLabelClass}>
        {labels.label}
      </label>
      <Input
        id={inputId}
        list={suggestionId}
        value={value}
        onChange={(event) => updateLocation(event.target.value)}
        onFocus={() => {
          updateSuggestionsPosition();
          setIsFocused(true);
        }}
        className={fieldControlClass}
        placeholder={labels.placeholder}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="col-start-3 row-span-2 row-start-1 h-8 w-8 self-center rounded-md"
        onClick={detectCurrentLocation}
        aria-label={labels.useCurrent}
        title={labels.useCurrent}
      >
        {isLocating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
      </Button>
      <datalist id={suggestionId}>
        {cities.map((city) => (
          <option key={city.slug} value={city.name} />
        ))}
        {manualLocationSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      {hasMounted && suggestionsList
        ? createPortal(suggestionsList, document.body)
        : null}
      {status ? (
        <span className="sr-only" aria-live="polite">
          {status}
        </span>
      ) : null}
    </div>
  );
}
