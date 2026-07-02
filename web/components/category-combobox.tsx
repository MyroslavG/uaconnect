"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

type CategoryComboboxProps = {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  allLabel?: string;
  ariaLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  className?: string;
  triggerClassName?: string;
};

type CategoryOption = Pick<Category, "slug" | "name" | "description">;

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  allLabel,
  ariaLabel,
  searchPlaceholder,
  emptyLabel,
  className,
  triggerClassName,
}: CategoryComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    left: 16,
    top: 16,
    width: 320,
  });
  const options = useMemo<CategoryOption[]>(() => {
    const baseOptions = allLabel
      ? [{ slug: "all", name: allLabel, description: "" }]
      : [];

    return [...baseOptions, ...categories];
  }, [allLabel, categories]);
  const selectedOption =
    options.find((option) => option.slug === value) ?? options[0];
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      [option.name, option.description, option.slug]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  const updateDropdownPosition = useCallback(() => {
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

    setDropdownPosition({
      left,
      top: rect.bottom + 8,
      width,
    });
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  function selectCategory(slug: string) {
    onValueChange(slug);
    setIsOpen(false);
    setQuery("");
  }

  const dropdown = (
    <div
      ref={dropdownRef}
      style={{
        left: dropdownPosition.left,
        top: dropdownPosition.top,
        width: dropdownPosition.width,
      }}
      className="fixed z-[9999] overflow-hidden rounded-lg border bg-popover p-2 text-popover-foreground shadow-lift"
    >
      <div className="grid h-10 grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-md border bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }

            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={searchPlaceholder}
          className="h-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/75"
        />
      </div>

      <div role="listbox" className="mt-2 max-h-72 overflow-y-auto">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const isSelected = option.slug === value;

            return (
              <button
                key={option.slug}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectCategory(option.slug)}
                className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-hover-blue hover:text-hover-blue-foreground"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {option.name}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-3 py-4 text-center text-sm font-semibold text-muted-foreground">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative min-w-0", isOpen && "z-[160]", className)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-sm text-left text-sm font-bold outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/25",
          triggerClassName,
        )}
        onClick={() => {
          if (!isOpen) {
            updateDropdownPosition();
          }

          setIsOpen((current) => !current);
          setQuery("");
        }}
      >
        <span className="truncate">{selectedOption?.name}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && hasMounted ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
