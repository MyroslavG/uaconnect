import businessesData from "@/data/businesses.json";
import categoriesData from "@/data/categories.json";
import citiesData from "@/data/cities.json";
import {
  getCategorySearchAliases,
  getExpandedSearchTerms,
} from "@/lib/search-aliases";
import type { Business, Category, City } from "@/lib/types";

export const cities = citiesData as City[];
export const categories = categoriesData as Category[];
export const businesses = businessesData as Business[];

export function getCity(slug: string) {
  return cities.find((city) => city.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getBusiness(slug: string) {
  return businesses.find((business) => business.slug === slug);
}

export function getBusinessesByCityAndCategory(citySlug: string, categorySlug: string) {
  return businesses.filter(
    (business) =>
      (business.citySlug === citySlug || business.servesAllCanada) &&
      business.categorySlug === categorySlug,
  );
}

export function getFeaturedBusinesses(limit = 6) {
  return businesses
    .filter((business) => business.featured)
    .slice(-limit)
    .reverse();
}

export function getRelatedBusinesses(business: Business, limit = 3) {
  return businesses
    .filter(
      (candidate) =>
        candidate.slug !== business.slug &&
        (candidate.citySlug === business.citySlug ||
          candidate.servesAllCanada ||
          candidate.categorySlug === business.categorySlug),
    )
    .slice(0, limit);
}

export function searchBusinesses(
  source: Business[],
  query: string | undefined,
) {
  const searchTerms = getExpandedSearchTerms(query);

  if (searchTerms.length === 0) {
    return source;
  }

  return source.filter((business) => {
    const haystack = [
      business.name,
      business.description,
      business.keywords,
      business.longDescription,
      business.category,
      getCategorySearchAliases(business.categorySlug),
      business.city,
      business.neighborhood,
      business.address,
      business.tags.join(" "),
      business.contentItems
        ?.map((item) => [item.title, item.description, item.location].join(" "))
        .join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return searchTerms.some((term) => haystack.includes(term));
  });
}

export function getAllExploreParams() {
  return cities.flatMap((city) =>
    categories.map((category) => ({
      city: city.slug,
      category: category.slug,
    })),
  );
}

export function getAllBusinessParams() {
  return businesses.map((business) => ({
    slug: business.slug,
  }));
}
