import { categories, cities, searchBusinesses } from "@/lib/data";
import {
  getDistanceInKm,
  resolveCityFromLocationInput,
  type Coordinates,
} from "@/lib/location";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Business } from "@/lib/types";

type PublishedBusiness = Database["public"]["Tables"]["businesses"]["Row"];

type SearchDirectoryBusinessesOptions = {
  query?: string;
  citySlug?: string;
  categorySlug?: string;
  coordinates?: Coordinates;
  radiusInKm?: number;
};

export async function getDirectoryBusinesses() {
  return getPublishedBusinesses();
}

export async function getDirectoryBusiness(slug: string) {
  return (await getPublishedBusinesses()).find(
    (business) => business.slug === slug,
  );
}

export async function getDirectoryBusinessesByCityAndCategory(
  citySlug: string,
  categorySlug: string,
) {
  const directoryBusinesses = await getDirectoryBusinesses();

  return directoryBusinesses.filter(
    (business) =>
      business.citySlug === citySlug && business.categorySlug === categorySlug,
  );
}

export async function getRelatedDirectoryBusinesses(
  business: Business,
  limit = 3,
) {
  const directoryBusinesses = await getDirectoryBusinesses();

  return directoryBusinesses
    .filter(
      (candidate) =>
        candidate.slug !== business.slug &&
        (candidate.citySlug === business.citySlug ||
          candidate.categorySlug === business.categorySlug),
    )
    .slice(0, limit);
}

export async function searchDirectoryBusinesses({
  query,
  citySlug,
  categorySlug,
  coordinates,
  radiusInKm = 75,
}: SearchDirectoryBusinessesOptions) {
  const directoryBusinesses = await getDirectoryBusinesses();
  const filteredBusinesses = directoryBusinesses
    .map((business) => {
      if (!coordinates) {
        return business;
      }

      const businessCity = cities.find(
        (candidate) => candidate.slug === business.citySlug,
      );

      if (!businessCity) {
        return business;
      }

      return {
        ...business,
        distanceInKm: Math.round(
          getDistanceInKm(coordinates, businessCity.coordinates),
        ),
      };
    })
    .filter((business) => {
      const matchesCity =
        citySlug && !coordinates ? business.citySlug === citySlug : true;
      const matchesCategory = categorySlug
        ? business.categorySlug === categorySlug
        : true;
      const matchesDistance =
        coordinates && typeof business.distanceInKm === "number"
          ? business.distanceInKm <= radiusInKm
          : true;

      return matchesCity && matchesCategory && matchesDistance;
    })
    .sort((firstBusiness, secondBusiness) => {
      if (!coordinates) {
        return 0;
      }

      return (
        (firstBusiness.distanceInKm ?? Number.POSITIVE_INFINITY) -
        (secondBusiness.distanceInKm ?? Number.POSITIVE_INFINITY)
      );
    });

  return searchBusinesses(filteredBusinesses, query);
}

async function getPublishedBusinesses(): Promise<Business[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapPublishedBusiness);
}

function mapPublishedBusiness(row: PublishedBusiness): Business {
  const category =
    categories.find((candidate) => candidate.slug === row.category_slug) ??
    categories[0];
  const cityResolution = resolveCityFromLocationInput(cities, row.city);
  const city = cityResolution?.city ?? cities[0];
  const businessName = row.name;
  const address = row.address ?? "";

  return {
    id: row.id,
    registrationId: row.registration_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    slug: row.slug,
    name: businessName,
    category: category.name,
    categorySlug: category.slug,
    city: city.name,
    citySlug: city.slug,
    neighborhood: row.city,
    description: row.description,
    longDescription: row.description,
    phone: row.phone ?? "",
    website: row.website ?? "",
    instagram: row.instagram ?? "",
    address,
    languages: ["Ukrainian", "English"],
    image: "",
    gallery: [],
    featured: false,
    hours: "See website",
    tags: [category.name, "Verified"],
  };
}
