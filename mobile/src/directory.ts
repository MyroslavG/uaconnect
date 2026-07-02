import { isSupabaseConfigured, supabase } from "./supabase";
import type { Business } from "./types";

export type BusinessRegistrationInput = {
  name: string;
  categorySlug: string;
  city: string;
  description: string;
  servesAllCanada: boolean;
};

type PublicBusinessRow = {
  id: string;
  registration_id: string | null;
  owner_id: string | null;
  slug: string;
  name: string;
  category_slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  logo_url: string | null;
  serves_all_canada: boolean;
  description: string;
  status: string;
};

type RegistrationRow = {
  id: string;
  owner_id: string;
  business_name: string;
  category_slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  logo_url: string | null;
  serves_all_canada: boolean;
  description: string;
  status: string;
};

type OwnerProfileRow = {
  owner_id: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
};

export async function fetchPublishedBusinesses(currentUserId?: string) {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PublicBusinessRow[];
  const ownerIds = rows
    .map((business) => business.owner_id)
    .filter((ownerId): ownerId is string => Boolean(ownerId));
  const ownerMap = await fetchOwnerProfiles(ownerIds);

  return rows.map((business) =>
    mapPublicBusiness(
      business,
      ownerMap.get(business.owner_id ?? ""),
      currentUserId,
    ),
  );
}

export async function fetchOwnedBusiness(ownerId: string) {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from("business_registrations")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapRegistration(data as RegistrationRow) : null;
}

export async function createBusinessRegistration(
  input: BusinessRegistrationInput,
  ownerId: string,
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { data, error } = await supabase
    .from("business_registrations")
    .insert({
      address: "",
      business_name: input.name.trim(),
      category_slug: input.categorySlug,
      city: input.city.trim(),
      description: input.description.trim(),
      owner_id: ownerId,
      serves_all_canada: input.servesAllCanada,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapRegistration(data as RegistrationRow);
}

export async function updateOwnedBusiness(business: Business, ownerId: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const registrationId = business.registrationId ?? business.id;
  const registrationPayload = {
    address: business.address ?? "",
    business_name: business.name.trim(),
    category_slug: business.categorySlug,
    city: business.city.trim(),
    description: business.description.trim(),
    instagram: normalizeNullable(business.instagram),
    logo_url: normalizeNullable(business.logoUrl),
    phone: normalizeNullable(business.phone),
    serves_all_canada: business.servesAllCanada,
    website: normalizeNullable(business.website),
  };

  const { data, error } = await supabase
    .from("business_registrations")
    .update(registrationPayload)
    .eq("id", registrationId)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await supabase
    .from("businesses")
    .update({
      address: registrationPayload.address,
      category_slug: registrationPayload.category_slug,
      city: registrationPayload.city,
      description: registrationPayload.description,
      instagram: registrationPayload.instagram,
      logo_url: registrationPayload.logo_url,
      name: registrationPayload.business_name,
      phone: registrationPayload.phone,
      serves_all_canada: registrationPayload.serves_all_canada,
      website: registrationPayload.website,
    })
    .eq("registration_id", registrationId)
    .eq("owner_id", ownerId);

  return mapRegistration(data as RegistrationRow);
}

async function fetchOwnerProfiles(ownerIds: string[]) {
  const uniqueOwnerIds = Array.from(new Set(ownerIds));
  const ownerMap = new Map<string, OwnerProfileRow>();

  if (!uniqueOwnerIds.length) {
    return ownerMap;
  }

  const { data, error } = await supabase.rpc("get_public_business_owners", {
    owner_ids: uniqueOwnerIds,
  });

  if (error) {
    return ownerMap;
  }

  for (const owner of (data ?? []) as OwnerProfileRow[]) {
    ownerMap.set(owner.owner_id, owner);
  }

  return ownerMap;
}

function normalizeNullable(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function mapPublicBusiness(
  business: PublicBusinessRow,
  owner?: OwnerProfileRow,
  currentUserId?: string,
): Business {
  return {
    address: business.address ?? undefined,
    categorySlug: business.category_slug,
    city: business.city,
    description: business.description,
    id: business.id,
    instagram: business.instagram ?? undefined,
    logoUrl: business.logo_url ?? undefined,
    name: business.name,
    ownedByCurrentUser: Boolean(
      currentUserId && business.owner_id === currentUserId,
    ),
    ownerAvatarUrl: owner?.owner_avatar_url ?? undefined,
    ownerId: business.owner_id ?? undefined,
    ownerName: owner?.owner_name ?? "",
    phone: business.phone ?? "",
    registrationId: business.registration_id ?? undefined,
    servesAllCanada: business.serves_all_canada,
    slug: business.slug,
    website: business.website ?? "",
  };
}

function mapRegistration(registration: RegistrationRow): Business {
  return {
    address: registration.address ?? undefined,
    categorySlug: registration.category_slug,
    city: registration.city,
    description: registration.description,
    id: registration.id,
    instagram: registration.instagram ?? undefined,
    logoUrl: registration.logo_url ?? undefined,
    name: registration.business_name,
    ownedByCurrentUser: true,
    ownerId: registration.owner_id,
    ownerName: "",
    phone: registration.phone ?? "",
    servesAllCanada: registration.serves_all_canada,
    website: registration.website ?? "",
  };
}
