import { BellRing, X } from "lucide-react";

import { removeSavedSearch } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { localizeCategory, type Locale } from "@/lib/i18n";
import type { Database } from "@/lib/supabase/database.types";
import type { Category } from "@/lib/types";

type SavedSearch = Database["public"]["Tables"]["saved_searches"]["Row"];

const text = {
  uk: {
    title: "Збережені пошуки",
    intro:
      "Отримуйте push-сповіщення, коли з'являється новий відповідний бізнес, товар, послуга або подія.",
    empty: "Збережіть пошук, щоб не пропустити нові відповідності.",
    localOnly: "Лише локальні",
    remove: "Прибрати пошук",
  },
  en: {
    title: "Збережені пошуки",
    intro:
      "Отримуйте push-сповіщення, коли з'являється новий відповідний бізнес, товар, послуга або подія.",
    empty: "Збережіть пошук, щоб не пропустити нові відповідності.",
    localOnly: "Лише локальні",
    remove: "Прибрати пошук",
  },
} satisfies Record<Locale, Record<string, string>>;

export function SavedSearchesSection({
  categories,
  locale,
  searches,
}: {
  categories: Category[];
  locale: Locale;
  searches: SavedSearch[];
}) {
  const labels = text[locale];

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-2xl font-black tracking-normal">{labels.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {labels.intro}
        </p>
      </div>
      {searches.length > 0 ? (
        <div className="grid gap-2">
          {searches.map((search) => (
            <Card className="border-border/80 bg-card shadow-none" key={search.id}>
              <CardContent className="flex min-h-14 items-center gap-3 p-3">
                <BellRing className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <p className="min-w-0 flex-1 text-sm font-bold leading-5">
                  {getSavedSearchLabel(search, categories, locale, labels.localOnly)}
                </p>
                <form action={removeSavedSearch}>
                  <input name="savedSearchId" type="hidden" value={search.id} />
                  <Button
                    aria-label={labels.remove}
                    className="h-9 w-9 rounded-full"
                    size="icon"
                    title={labels.remove}
                    type="submit"
                    variant="outline"
                  >
                    <X className="h-4 w-4" strokeWidth={2.6} />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-card/70 shadow-none">
          <CardContent className="p-6 text-sm font-semibold text-muted-foreground">
            {labels.empty}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function getSavedSearchLabel(
  search: SavedSearch,
  categories: Category[],
  locale: Locale,
  localOnlyLabel: string,
) {
  const category = categories.find((item) => item.slug === search.category_slug);
  const parts = [
    search.query,
    category ? localizeCategory(category, locale).name : search.category_slug,
    search.city,
  ].filter(Boolean);

  if (search.local_only) {
    parts.push(localOnlyLabel);
  }

  return parts.join(" · ");
}
