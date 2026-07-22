import Link from "next/link";
import {
  ArrowRight,
  Compass,
  MapPin,
  Search,
  Sparkles,
  Store,
  Utensils,
} from "lucide-react";

import {
  BusinessContentCards,
  BusinessContentPulseList,
} from "@/components/business-content-cards";
import { CategoryGrid } from "@/components/category-grid";
import { SearchPanel } from "@/components/search-panel";
import { Badge } from "@/components/ui/badge";
import { categories, cities } from "@/lib/data";
import { getDirectoryBusinesses } from "@/lib/directory-data";
import { copy, localizeCategories, localizeCities } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { Business } from "@/lib/types";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const user = await getCurrentUser();
  const canViewContacts = Boolean(user);
  const labels = copy[locale].home;
  const contentLabels = getHomeContentLabels(locale);
  const localizedCities = localizeCities(cities, locale).map((city) => ({
    ...city,
    summary: "",
  }));
  const localizedCategories = localizeCategories(categories, locale);
  const directoryBusinesses = await getDirectoryBusinesses();
  const featuredContentItems = getFeaturedContentItems(directoryBusinesses, 6);
  const featuredBusinesses = getFeaturedBusinesses(directoryBusinesses, 5);
  const homeStats = getHomeStats(
    directoryBusinesses,
    localizedCategories.length,
    localizedCities.length,
    locale,
  );
  const quickPlans = getQuickPlans(locale);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b bg-background">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,hsl(var(--foreground)/0.08),transparent_62%)]" />
        <div className="container relative grid min-h-[600px] gap-8 py-12 md:py-16 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="max-w-3xl">
            <Badge variant="outline" className="bg-card text-foreground">
              {labels.badge}
            </Badge>
            <h1 className="mt-5 text-balance text-5xl font-black tracking-normal sm:text-6xl lg:text-7xl">
              Kolo
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
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
                  className="rounded-md border bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground"
                >
                  {city.name}
                </Link>
              ))}
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {homeStats.map((stat) => (
                <div
                  className="rounded-lg border bg-card/80 px-4 py-3 shadow-sm"
                  key={stat.label}
                >
                  <p className="text-2xl font-black leading-none">{stat.value}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <HomePulsePanel
            businesses={featuredBusinesses}
            canViewContacts={canViewContacts}
            contentItems={featuredContentItems.slice(0, 3)}
            labels={contentLabels}
          />
        </div>
      </section>

      <section className="container py-10 md:py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {quickPlans.map((plan, index) => (
            <Link
              className="group rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-lift"
              href={`/search?category=${plan.categorySlug}`}
              key={plan.title}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground transition group-hover:bg-hover-blue group-hover:text-hover-blue-foreground">
                {index === 0 ? (
                  <Utensils className="h-5 w-5" />
                ) : index === 1 ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Compass className="h-5 w-5" />
                )}
              </span>
              <h2 className="mt-5 text-2xl font-black tracking-normal">
                {plan.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {plan.text}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-primary transition group-hover:text-hover-blue-foreground">
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container pb-12 md:pb-16">
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

      {featuredContentItems.length > 0 ? (
        <section className="container pb-12 md:pb-16">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">{contentLabels.kicker}</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal">
                {contentLabels.title}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {contentLabels.text}
            </p>
          </div>
          <BusinessContentCards
            canViewContacts={canViewContacts}
            entries={featuredContentItems}
            labels={contentLabels}
            nextPath="/"
            showBusinessName
          />
        </section>
      ) : null}

      <section className="border-y bg-card/65 py-12 backdrop-blur dark:bg-card/40 md:py-16">
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

function HomePulsePanel({
  businesses,
  canViewContacts,
  contentItems,
  labels,
}: {
  businesses: Business[];
  canViewContacts: boolean;
  contentItems: Array<{ business: Business; item: NonNullable<Business["contentItems"]>[number] }>;
  labels: ReturnType<typeof getHomeContentLabels>;
}) {
  return (
    <aside className="hidden rounded-lg border bg-card/90 p-5 shadow-soft backdrop-blur lg:block">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">
            {labels.pulseKicker}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-normal">
            {labels.pulseTitle}
          </h2>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>

      {contentItems.length > 0 ? (
        <BusinessContentPulseList
          canViewContacts={canViewContacts}
          entries={contentItems}
          labels={labels}
          nextPath="/"
        />
      ) : (
        <div className="mt-5 grid gap-3">
          {businesses.slice(0, 3).map((business) => (
              <Link
                className="group rounded-md border bg-background p-4 transition hover:border-hover-blue-border hover:bg-hover-blue"
                href={`/business/${business.slug}`}
                key={business.id}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary">
                    <Store className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 font-black">{business.name}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {business.category} · {business.city}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      )}

      <Link
        className="mt-4 flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-black transition hover:border-hover-blue-border hover:bg-hover-blue"
        href="/search"
      >
        <Search className="h-4 w-4" />
        {labels.searchCta}
      </Link>
    </aside>
  );
}

function getFeaturedContentItems(businesses: Business[], limit: number) {
  return businesses
    .flatMap((business) =>
      (business.contentItems ?? []).map((item) => ({ business, item })),
    )
    .sort((firstItem, secondItem) => {
      const firstTime = new Date(firstItem.item.createdAt ?? 0).getTime();
      const secondTime = new Date(secondItem.item.createdAt ?? 0).getTime();

      return secondTime - firstTime;
    })
    .slice(0, limit);
}

function getFeaturedBusinesses(businesses: Business[], limit: number) {
  return [
    ...businesses.filter(
      (business) => business.logoUrl || (business.contentItems ?? []).length > 0,
    ),
    ...businesses,
  ]
    .filter(
      (business, index, allBusinesses) =>
        allBusinesses.findIndex((item) => item.id === business.id) === index,
    )
    .slice(0, limit);
}

function getHomeStats(
  businesses: Business[],
  categoryCount: number,
  cityCount: number,
  locale: "uk" | "en",
) {
  return locale === "uk"
    ? [
        { label: "бізнесів", value: businesses.length.toString() },
        { label: "категорій", value: categoryCount.toString() },
        { label: "міст", value: cityCount.toString() },
      ]
    : [
        { label: "businesses", value: businesses.length.toString() },
        { label: "categories", value: categoryCount.toString() },
        { label: "cities", value: cityCount.toString() },
      ];
}

function getQuickPlans(locale: "uk" | "en") {
  return locale === "uk"
    ? [
        {
          categorySlug: "grocery-stores",
          cta: "Знайти їжу",
          text: "Кафе, пекарні, готові страви та локальні продукти на сьогодні.",
          title: "Смачна зупинка",
        },
        {
          categorySlug: "wellness-care",
          cta: "Обрати сервіс",
          text: "Краса, здоров'я, тренери, фото та спеціалісти для себе.",
          title: "Час для себе",
        },
        {
          categorySlug: "events",
          cta: "Подивитись події",
          text: "Івенти, туризм, квіти, декор і цікаві місця на вихідні.",
          title: "Плани на вихідні",
        },
      ]
    : [
        {
          categorySlug: "grocery-stores",
          cta: "Find food",
          text: "Cafes, bakeries, ready meals, and local products for today.",
          title: "Something tasty",
        },
        {
          categorySlug: "wellness-care",
          cta: "Pick a service",
          text: "Beauty, wellness, trainers, photo, and specialists for yourself.",
          title: "Time for yourself",
        },
        {
          categorySlug: "events",
          cta: "Browse events",
          text: "Events, travel, flowers, decor, and interesting weekend places.",
          title: "Weekend plans",
        },
      ];
}

function getHomeContentLabels(locale: "uk" | "en") {
  return locale === "uk"
    ? {
        kicker: "Нове",
        title: "Послуги та події",
        text: "Актуальні пропозиції від українських бізнесів у Канаді.",
        contactSignInText:
          "Локацію та посилання видно лише після входу.",
        contactSignInTitle: "Увійдіть, щоб побачити контакти",
        service: "Послуга",
        event: "Подія",
        free: "Безкоштовно",
        link: "Посилання",
        online: "Онлайн",
        pulseKicker: "Живий пульс",
        pulseTitle: "Новинки від бізнесів",
        searchCta: "Відкрити пошук",
        signIn: "Увійти",
      }
    : {
        kicker: "New",
        title: "Services and events",
        text: "Fresh offers and upcoming events from Ukrainian businesses in Canada.",
        contactSignInText:
          "Location and external links are visible after sign-in.",
        contactSignInTitle: "Sign in to view contacts",
        service: "Service",
        event: "Event",
        free: "Free",
        link: "Link",
        online: "Online",
        pulseKicker: "Live pulse",
        pulseTitle: "Fresh from owners",
        searchCta: "Open search",
        signIn: "Sign in",
      };
}
