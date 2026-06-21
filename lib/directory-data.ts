import { categories, cities, searchBusinesses } from "@/lib/data";
import {
  getDistanceInKm,
  resolveCityFromLocationInput,
  resolveLocationCoordinates,
  type Coordinates,
} from "@/lib/location";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Business } from "@/lib/types";

type PublishedBusiness = Database["public"]["Tables"]["businesses"]["Row"];
type PublicBusinessOwner =
  Database["public"]["Functions"]["get_public_business_owners"]["Returns"][number];

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

      const businessLocation = resolveLocationCoordinates(
        cities,
        business.city || business.neighborhood,
      );

      if (!businessLocation) {
        return business;
      }

      return {
        ...business,
        distanceInKm: Math.round(
          getDistanceInKm(coordinates, businessLocation.coordinates),
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

  const ownerIds = Array.from(
    new Set(
      data
        .map((row) => row.owner_id)
        .filter((ownerId): ownerId is string => Boolean(ownerId)),
    ),
  );
  const ownersById = new Map<string, PublicBusinessOwner>();

  if (ownerIds.length > 0) {
    const { data: owners, error: ownersError } = await supabase.rpc(
      "get_public_business_owners",
      { owner_ids: ownerIds },
    );

    if (!ownersError && owners) {
      for (const owner of owners) {
        ownersById.set(owner.owner_id, owner);
      }
    }
  }

  return data.map((row) =>
    mapPublishedBusiness(
      row,
      row.owner_id ? ownersById.get(row.owner_id) : undefined,
    ),
  );
}

function mapPublishedBusiness(
  row: PublishedBusiness,
  owner?: PublicBusinessOwner,
): Business {
  const category =
    categories.find((candidate) => candidate.slug === row.category_slug) ??
    categories[0];
  const rawLocation = row.city.trim();
  const cityResolution = resolveCityFromLocationInput(cities, rawLocation);
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
    city: rawLocation || cityResolution?.city.name || "",
    citySlug: cityResolution?.city.slug ?? "",
    neighborhood: cityResolution?.kind === "nearby" ? rawLocation : "",
    description: row.description,
    longDescription: row.description,
    phone: row.phone ?? "",
    website: row.website ?? "",
    instagram: row.instagram ?? "",
    logoUrl: row.logo_url ?? "",
    ownerName: owner?.owner_name ?? "",
    ownerAvatarUrl: owner?.owner_avatar_url ?? "",
    address,
    languages: ["Ukrainian", "English"],
    image: "",
    gallery: [],
    featured: false,
    hours: "See website",
    tags: [category.name],
    verifiedAt: row.verified_at ?? undefined,
  };
}
