import Link from "next/link";

import { categories, cities } from "@/lib/data";
import { copy, localizeCategories, localizeCities, type Locale } from "@/lib/i18n";

type SiteFooterProps = {
  locale: Locale;
};

export function SiteFooter({ locale }: SiteFooterProps) {
  const labels = copy[locale].footer;
  const localizedCities = localizeCities(cities, locale);
  const localizedCategories = localizeCategories(categories, locale);

  return (
    <footer className="border-t bg-card/40">
      <div className="container grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href="/" className="text-lg font-black">
            UAConnect
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {labels.text}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">{labels.cities}</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {localizedCities.map((city) => (
              <Link key={city.slug} href={`/${city.slug}/restaurants`}>
                {city.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">{labels.categories}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {localizedCategories.map((category) => (
              <Link key={category.slug} href={`/search?category=${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
