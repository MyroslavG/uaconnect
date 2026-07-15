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
import type { Business, BusinessContentItem } from "@/lib/types";

type PublishedBusiness = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessContentRow =
  Database["public"]["Tables"]["business_content_items"]["Row"];
type SavedBusinessRow =
  Database["public"]["Tables"]["saved_businesses"]["Row"];
type PublicBusinessOwner =
  Database["public"]["Functions"]["get_public_business_owners"]["Returns"][number];

type SearchDirectoryBusinessesOptions = {
  query?: string;
  citySlug?: string;
  categorySlug?: string;
  coordinates?: Coordinates;
  radiusInKm?: number;
  currentUserId?: string;
};

export async function getDirectoryBusinesses(currentUserId?: string) {
  return getPublishedBusinesses(currentUserId);
}

export async function getDirectoryBusiness(slug: string, currentUserId?: string) {
  return (await getPublishedBusinesses(currentUserId)).find(
    (business) => business.slug === slug,
  );
}

export async function getDirectoryBusinessesByCityAndCategory(
  citySlug: string,
  categorySlug: string,
  currentUserId?: string,
) {
  const directoryBusinesses = await getDirectoryBusinesses(currentUserId);

  return directoryBusinesses.filter(
    (business) =>
      (business.citySlug === citySlug || business.servesAllCanada) &&
      business.categorySlug === categorySlug,
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
          candidate.servesAllCanada ||
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
  currentUserId,
}: SearchDirectoryBusinessesOptions) {
  const directoryBusinesses = await getDirectoryBusinesses(currentUserId);
  const filteredBusinesses = directoryBusinesses
    .map((business) => {
      if (!coordinates || business.servesAllCanada) {
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
        citySlug && !coordinates
          ? business.citySlug === citySlug || business.servesAllCanada
          : true;
      const matchesCategory = categorySlug
        ? business.categorySlug === categorySlug
        : true;
      const matchesDistance =
        business.servesAllCanada ||
        !coordinates ||
        typeof business.distanceInKm !== "number" ||
        business.distanceInKm <= radiusInKm;

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

export async function getSavedDirectoryBusinesses(currentUserId: string) {
  const businesses = await getPublishedBusinesses(currentUserId);

  return businesses.filter((business) => business.isSaved);
}

async function getPublishedBusinesses(currentUserId?: string): Promise<Business[]> {
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
  const registrationIds = data
    .map((row) => row.registration_id)
    .filter((registrationId): registrationId is string =>
      Boolean(registrationId),
    );
  const contentItemsByRegistrationId =
    await getPublishedBusinessContentItems(registrationIds);
  const savedBusinessIds = currentUserId
    ? await getSavedBusinessIds(currentUserId)
    : new Set<string>();

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
      row.registration_id
        ? contentItemsByRegistrationId.get(row.registration_id)
        : undefined,
      savedBusinessIds.has(row.id),
    ),
  );
}

async function getSavedBusinessIds(currentUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_businesses")
    .select("business_id")
    .eq("user_id", currentUserId);

  if (error || !data) {
    return new Set<string>();
  }

  return new Set((data as SavedBusinessRow[]).map((row) => row.business_id));
}

async function getPublishedBusinessContentItems(registrationIds: string[]) {
  const itemsByRegistrationId = new Map<string, BusinessContentItem[]>();

  if (registrationIds.length === 0) {
    return itemsByRegistrationId;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_content_items")
    .select("*")
    .in("registration_id", registrationIds)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return itemsByRegistrationId;
  }

  for (const row of data as BusinessContentRow[]) {
    const items = itemsByRegistrationId.get(row.registration_id) ?? [];
    items.push(mapBusinessContentItem(row));
    itemsByRegistrationId.set(row.registration_id, items);
  }

  return itemsByRegistrationId;
}

function mapPublishedBusiness(
  row: PublishedBusiness,
  owner?: PublicBusinessOwner,
  contentItems: BusinessContentItem[] = [],
  isSaved = false,
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
    servesAllCanada: row.serves_all_canada,
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
    isSaved,
    tags: [category.name],
    contentItems,
    verifiedAt: row.verified_at ?? undefined,
  };
}

function mapBusinessContentItem(row: BusinessContentRow): BusinessContentItem {
  return {
    id: row.id,
    registrationId: row.registration_id,
    ownerId: row.owner_id,
    type: row.content_type,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    isFree: row.is_free,
    isOnline: row.is_online,
    price: row.price ?? undefined,
    startsAt: row.starts_at ?? undefined,
    location: row.location ?? undefined,
    linkUrl: row.link_url ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
