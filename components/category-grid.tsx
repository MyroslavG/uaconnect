import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Car,
  Clapperboard,
  Code2,
  Flower2,
  GraduationCap,
  Hammer,
  Home,
  Megaphone,
  ShieldCheck,
  Sofa,
  Scale,
  Scissors,
  Sparkles,
  ShoppingBasket,
  Store,
  Utensils,
  Wrench,
} from "lucide-react";

import type { Category } from "@/lib/types";

const iconMap = {
  restaurants: Utensils,
  lawyers: Scale,
  realtors: Home,
  "insurance-brokers": ShieldCheck,
  beauty: Scissors,
  construction: Hammer,
  "repair-services": Wrench,
  "textile-decor": Sofa,
  cleaning: Sparkles,
  "auto-repair": Car,
  tutors: GraduationCap,
  "it-services": Code2,
  flowers: Flower2,
  events: CalendarDays,
  photographers: Clapperboard,
  "advertising-services": Megaphone,
  "grocery-stores": ShoppingBasket,
  shops: Store,
} as const;

type CategoryGridProps = {
  categories: Category[];
  citySlug?: string;
};

export function CategoryGrid({ categories, citySlug = "ottawa" }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {categories.map((category) => {
        const Icon = iconMap[category.slug as keyof typeof iconMap] ?? Home;

        return (
          <Link
            key={category.slug}
            href={`/${citySlug}/${category.slug}`}
            className="group relative grid h-full min-h-[164px] grid-rows-[auto_1fr] overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-lift"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-zinc-400" />
            <span className="flex items-start gap-3 pt-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/10 transition group-hover:bg-hover-blue group-hover:text-hover-blue-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 pt-1">
                <span className="flex min-h-10 items-start justify-between gap-2 text-[15px] font-black leading-5">
                  <span className="line-clamp-2">{category.name}</span>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
              </span>
            </span>
            <span className="mt-4 flex flex-col justify-end">
              <span className="line-clamp-3 block text-sm leading-6 text-muted-foreground">
                {category.description}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
