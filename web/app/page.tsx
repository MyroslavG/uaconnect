import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { CategoryGrid } from "@/components/category-grid";
import { SearchPanel } from "@/components/search-panel";
import { Badge } from "@/components/ui/badge";
import { categories, cities } from "@/lib/data";
import { copy, localizeCategories, localizeCities } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const labels = copy[locale].home;
  const localizedCities = localizeCities(cities, locale).map((city) => ({
    ...city,
    summary: "",
  }));
  const localizedCategories = localizeCategories(categories, locale);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(10,12,11,0.98)_0%,rgba(20,32,36,0.92)_52%,rgba(40,56,62,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_47px,rgba(255,255,255,0.045)_48px),linear-gradient(0deg,transparent_0,transparent_47px,rgba(255,255,255,0.045)_48px)] bg-[size:48px_48px]" />
        <div className="container relative grid min-h-[600px] gap-8 py-12 text-white md:py-16 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="max-w-3xl">
            <Badge className="border-accent/30 bg-accent/15 text-accent hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground">
              {labels.badge}
            </Badge>
            <h1 className="mt-5 text-balance text-5xl font-black tracking-normal sm:text-6xl lg:text-7xl">
              UAConnect
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-lg leading-8 text-white/85">
              {labels.intro}
            </p>
            <div className="mt-8">
              <SearchPanel
                cities={localizedCities}
                categories={localizedCategories}
                locale={locale}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {localizedCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/search?city=${city.slug}`}
                  className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white/90 backdrop-blur transition hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur lg:block">
            <p className="text-xs font-black uppercase text-accent">
              {labels.categoryKicker}
            </p>
            <div className="mt-4 grid gap-3">
              {localizedCategories.slice(0, 5).map((category) => (
                <Link
                  key={category.slug}
                  href={`/search?category=${category.slug}`}
                  className="group flex items-center justify-between rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold transition hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground"
                >
                  {category.name}
                  <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">{labels.categoryKicker}</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal">
              {labels.categoryTitle}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {labels.categoryText}
          </p>
        </div>
        <CategoryGrid categories={localizedCategories} />
      </section>

      <section className="border-y border-white/60 bg-white/55 py-12 backdrop-blur dark:border-white/10 dark:bg-zinc-950/30 md:py-16">
        <div className="container">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">{labels.cityKicker}</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal">
                {labels.cityTitle}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {labels.cityText}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {localizedCities.map((city) => (
              <Link
                key={city.slug}
                href={`/search?city=${city.slug}`}
                className="group flex min-h-40 flex-col rounded-lg border bg-card p-5 text-card-foreground shadow-sm transition hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-lift"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/10 transition group-hover:bg-hover-blue group-hover:text-hover-blue-foreground">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="mt-5 block text-2xl font-black">{city.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {city.province}
                </span>
                <span className="mt-auto flex items-center justify-between pt-6 text-sm font-bold text-primary transition group-hover:text-hover-blue-foreground">
                  {labels.cityExplore}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
