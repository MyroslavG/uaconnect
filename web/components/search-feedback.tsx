"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";

type SearchFeedbackProps = {
  categorySlug?: string;
  city?: string;
  enabled: boolean;
  locale: Locale;
  localOnly: boolean;
  query?: string;
  radiusInKm?: number;
  resultCount: number;
  source: "web_search";
};

export function SearchFeedback({
  categorySlug,
  city,
  enabled,
  locale,
  localOnly,
  query,
  radiusInKm,
  resultCount,
  source,
}: SearchFeedbackProps) {
  const [feedbackBySearch, setFeedbackBySearch] = useState<Record<string, boolean>>(
    {},
  );
  const normalizedQuery = query?.trim() ?? "";
  const searchKey = useMemo(
    () =>
      JSON.stringify({
        categorySlug: categorySlug ?? "all",
        city: city ?? "all-canada",
        localOnly,
        normalizedQuery,
        radiusInKm: radiusInKm ?? null,
        resultCount,
        source,
      }),
    [
      categorySlug,
      city,
      localOnly,
      normalizedQuery,
      radiusInKm,
      resultCount,
      source,
    ],
  );
  const feedback = feedbackBySearch[searchKey];
  const copy =
    locale === "uk"
      ? {
          negative: "Ні",
          positive: "Так",
          question: "Результати були корисними?",
          thanks: "Дякуємо за відгук.",
        }
      : {
          negative: "No",
          positive: "Yes",
          question: "Were these results helpful?",
          thanks: "Thank you for your feedback.",
        };

  if (!enabled || resultCount === 0) {
    return null;
  }

  function submitFeedback(helpful: boolean) {
    if (feedback !== undefined) {
      return;
    }

    setFeedbackBySearch((current) => ({ ...current, [searchKey]: helpful }));
    const hasKeyword = Boolean(normalizedQuery);
    const hasCategory = Boolean(categorySlug && categorySlug !== "all");
    const hasLocation = Boolean(city && city !== "all-canada");

    void trackAnalyticsEvent({
      category_slug: categorySlug,
      city,
      event_type: "search_feedback",
      metadata: {
        hasCategory,
        hasKeyword,
        hasLocation,
        helpful,
        localOnly,
        radiusInKm,
        resultCount,
        searchEngine: hasKeyword ? "relevance_v2" : "directory",
        source,
      },
      search_query: normalizedQuery || null,
    });
  }

  return (
    <section className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-muted-foreground">
        {feedback === undefined ? copy.question : copy.thanks}
      </p>
      {feedback === undefined ? (
        <div className="flex gap-2">
          <Button onClick={() => submitFeedback(true)} size="sm" variant="outline">
            <ThumbsUp className="h-4 w-4" />
            {copy.positive}
          </Button>
          <Button onClick={() => submitFeedback(false)} size="sm" variant="outline">
            <ThumbsDown className="h-4 w-4" />
            {copy.negative}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
