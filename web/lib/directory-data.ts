import { categories, cities, searchBusinesses } from "@/lib/data";
import {
  getDistanceInKm,
  resolveCityFromLocationInput,
  resolveLocationCoordinates,
  type Coordinates,
} from "@/lib/location";
import { rankBusinesses } from "@/lib/business-ranking";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Business,
  BusinessContentItem,
  BusinessRankingSignals,
} from "@/lib/types";

type PublishedBusiness = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessContentRow =
  Database["public"]["Tables"]["business_content_items"]["Row"];
type BusinessContentSignalRow = Pick<
  BusinessContentRow,
  "content_type" | "created_at" | "registration_id" | "starts_at" | "updated_at"
>;
type SavedBusinessRow =
  Database["public"]["Tables"]["saved_businesses"]["Row"];
type PublicBusinessOwner =
  Database["public"]["Functions"]["get_public_business_owners"]["Returns"][number];

type SearchDirectoryBusinessesOptions = {
  query?: string;
  citySlug?: string;
  categorySlug?: string;
  coordinates?: Coordinates;
  localOnly?: boolean;
  radiusInKm?: number;
  currentUserId?: string;
};

type GetDirectoryBusinessesOptions = {
  contentItemsLimit?: number;
  includeContentItems?: boolean;
};

export async function getDirectoryBusinesses(
  currentUserId?: string,
  options: GetDirectoryBusinessesOptions = {},
) {
  return getPublishedBusinesses({
    contentItemsLimit: options.contentItemsLimit,
    currentUserId,
    includeContentItems: options.includeContentItems ?? true,
  });
}

export async function getDirectoryBusiness(slug: string, currentUserId?: string) {
  return (await getPublishedBusinesses({ currentUserId })).find(
    (business) => business.slug === slug,
  );
}

export async function getDirectoryBusinessesByCityAndCategory(
  citySlug: string,
  categorySlug: string,
  currentUserId?: string,
  localOnly = false,
  includeContentItems = false,
) {
  const directoryBusinesses = await getDirectoryBusinesses(currentUserId, {
    includeContentItems,
  });

  return directoryBusinesses.filter(
    (business) =>
      (business.citySlug === citySlug ||
        (!localOnly && business.servesAllCanada)) &&
      business.categorySlug === categorySlug,
  );
}

export async function getRelatedDirectoryBusinesses(
  business: Business,
  limit = 3,
) {
  const directoryBusinesses = await getDirectoryBusinesses(undefined, {
    includeContentItems: false,
  });

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
  localOnly = false,
  radiusInKm = 75,
  currentUserId,
}: SearchDirectoryBusinessesOptions) {
  const hasContentSearch = Boolean(query?.trim());
  const directoryBusinesses = await getDirectoryBusinesses(currentUserId, {
    includeContentItems: hasContentSearch,
  });
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
          ? business.citySlug === citySlug ||
            (!localOnly && business.servesAllCanada)
          : true;
      const matchesCategory = categorySlug
        ? business.categorySlug === categorySlug
        : true;
      const matchesDistance =
        (!localOnly && business.servesAllCanada) ||
        !coordinates ||
        typeof business.distanceInKm !== "number" ||
        business.distanceInKm <= radiusInKm;
      const matchesOnline = !localOnly || !business.servesAllCanada;

      return matchesCity && matchesCategory && matchesDistance && matchesOnline;
    })
  return rankBusinesses(searchBusinesses(filteredBusinesses, query), {
    categorySlug,
    citySlug,
    query,
  }).map(stripListingSignals);
}

export async function getSavedDirectoryBusinesses(currentUserId: string) {
  const businesses = await getPublishedBusinesses({
    currentUserId,
    includeContentItems: false,
  });

  return businesses.filter((business) => business.isSaved);
}

async function getPublishedBusinesses({
  contentItemsLimit,
  currentUserId,
  includeContentItems = true,
}: {
  contentItemsLimit?: number;
  currentUserId?: string;
  includeContentItems?: boolean;
} = {}): Promise<Business[]> {
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
  const contentItemsByRegistrationId = includeContentItems
    ? await getPublishedBusinessContentItems(registrationIds, contentItemsLimit)
    : new Map<string, BusinessContentItem[]>();
  const rankingSignalsByRegistrationId =
    await getPublishedBusinessContentSignals(registrationIds);
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
      row.registration_id
        ? rankingSignalsByRegistrationId.get(row.registration_id)
        : undefined,
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

async function getPublishedBusinessContentItems(
  registrationIds: string[],
  limit?: number,
) {
  const itemsByRegistrationId = new Map<string, BusinessContentItem[]>();

  if (registrationIds.length === 0) {
    return itemsByRegistrationId;
  }

  const supabase = await createClient();
  let query = supabase
    .from("business_content_items")
    .select("*")
    .in("registration_id", registrationIds)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

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

async function getPublishedBusinessContentSignals(registrationIds: string[]) {
  const signalsByRegistrationId = new Map<string, BusinessRankingSignals>();

  if (registrationIds.length === 0) {
    return signalsByRegistrationId;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_content_items")
    .select("registration_id, content_type, starts_at, created_at, updated_at")
    .in("registration_id", registrationIds)
    .eq("status", "published");

  if (error || !data) {
    return signalsByRegistrationId;
  }

  const now = Date.now();

  for (const row of data as BusinessContentSignalRow[]) {
    const signals = signalsByRegistrationId.get(row.registration_id) ?? {
      contentCount: 0,
      eventCount: 0,
      serviceCount: 0,
      upcomingEventCount: 0,
    };

    signals.contentCount += 1;

    if (row.content_type === "service") {
      signals.serviceCount += 1;
    }

    if (row.content_type === "event") {
      signals.eventCount += 1;

      if (getTimestamp(row.starts_at) >= now) {
        signals.upcomingEventCount += 1;
      }
    }

    signals.latestContentAt = getLatestDate([
      signals.latestContentAt,
      row.updated_at,
      row.created_at,
    ]);

    signalsByRegistrationId.set(row.registration_id, signals);
  }

  return signalsByRegistrationId;
}

function stripListingSignals(business: Business): Business {
  const businessWithoutListingSignals = { ...business };
  delete businessWithoutListingSignals.contentItems;
  delete businessWithoutListingSignals.rankingSignals;

  return businessWithoutListingSignals;
}

function getLatestDate(values: Array<string | undefined | null>) {
  const latestTimestamp = Math.max(0, ...values.map(getTimestamp));

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : undefined;
}

function getTimestamp(value: string | undefined | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeCategorySlug(value: string | null | undefined) {
  const normalizedSlug = value?.trim().toLowerCase();

  if (!normalizedSlug || normalizedSlug === "others") {
    return "other";
  }

  return normalizedSlug;
}

function getFallbackCategoryName(slug: string) {
  if (slug === "other") {
    return "Other";
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapPublishedBusiness(
  row: PublishedBusiness,
  owner?: PublicBusinessOwner,
  contentItems: BusinessContentItem[] = [],
  isSaved = false,
  rankingSignals?: BusinessRankingSignals,
): Business {
  const categorySlug = normalizeCategorySlug(row.category_slug);
  const category =
    categories.find((candidate) => candidate.slug === categorySlug) ?? {
      description: "",
      name: getFallbackCategoryName(categorySlug),
      slug: categorySlug,
    };
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
    categorySlug,
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
    hours: "",
    isSaved,
    tags: [category.name],
    contentItems,
    createdAt: row.created_at,
    rankingSignals,
    updatedAt: row.updated_at,
    verifiedAt: row.verified_at ?? undefined,
  };
}

function mapBusinessContentItem(row: BusinessContentRow): BusinessContentItem {
  const imageUrls = getBusinessContentImageUrls(row);

  return {
    id: row.id,
    registrationId: row.registration_id,
    ownerId: row.owner_id,
    type: row.content_type,
    title: row.title,
    description: row.description,
    imageUrl: imageUrls[0],
    imageUrls,
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

function getBusinessContentImageUrls(row: BusinessContentRow) {
  const imageUrls = Array.isArray(row.image_urls)
    ? row.image_urls.filter((url): url is string => typeof url === "string" && Boolean(url.trim()))
    : [];
  const coverImageUrl = row.image_url?.trim();

  if (coverImageUrl && !imageUrls.includes(coverImageUrl)) {
    return [coverImageUrl, ...imageUrls];
  }

  return imageUrls;
}
