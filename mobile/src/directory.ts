import { isSupabaseConfigured, supabase } from "./supabase";
import type {
  Business,
  BusinessContentImageInput,
  BusinessContentInput,
  BusinessContentItem,
  BusinessContentType,
  BusinessContentUpdateInput,
} from "./types";

export type BusinessRegistrationInput = {
  name: string;
  categorySlug: string;
  city: string;
  address?: string;
  description: string;
  instagram?: string;
  logo?: BusinessLogoInput | null;
  phone?: string;
  servesAllCanada: boolean;
  website?: string;
};

export type BusinessLogoInput = {
  base64?: string | null;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
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

type BusinessContentRow = {
  id: string;
  registration_id: string;
  owner_id: string;
  content_type: BusinessContentType;
  title: string;
  description: string;
  image_url: string | null;
  is_free: boolean | null;
  is_online: boolean | null;
  price: string | null;
  starts_at: string | null;
  location: string | null;
  link_url: string | null;
  status: "draft" | "published";
  created_at: string;
};

export async function fetchPublishedBusinesses(currentUserId?: string) {
  if (!isSupabaseConfigured) {
    return [];
  }

  const rows = await fetchAllPublishedBusinessRows();
  const ownerIds = rows
    .map((business) => business.owner_id)
    .filter((ownerId): ownerId is string => Boolean(ownerId));
  const ownerMap = await fetchOwnerProfiles(ownerIds);
  const contentMap = await fetchPublishedBusinessContent(
    rows
      .map((business) => business.registration_id)
      .filter((registrationId): registrationId is string => Boolean(registrationId)),
  );

  return rows.map((business) =>
    mapPublicBusiness(
      business,
      ownerMap.get(business.owner_id ?? ""),
      currentUserId,
      contentMap.get(business.registration_id ?? "") ?? [],
    ),
  );
}

async function fetchAllPublishedBusinessRows() {
  const pageSize = 10;
  const rows: PublicBusinessRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as PublicBusinessRow[];
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }

    offset += pageSize;
  }
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

export async function fetchOwnedBusinessContent(
  ownerId: string,
  registrationId: string,
) {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("business_content_items")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("registration_id", registrationId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingContentTableError(error)) {
      return [];
    }

    throw error;
  }

  return ((data ?? []) as BusinessContentRow[]).map(mapBusinessContentItem);
}

export async function createBusinessContentItem(
  input: BusinessContentInput,
  ownerId: string,
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { data, error } = await supabase
    .from("business_content_items")
    .insert({
      content_type: input.type,
      description: input.description.trim(),
      image_url: null,
      is_free: input.isFree,
      is_online: input.isOnline,
      link_url: normalizeNullable(input.linkUrl),
      location: normalizeNullable(input.location),
      owner_id: ownerId,
      price: input.isFree ? null : normalizeNullable(input.price),
      registration_id: input.registrationId,
      starts_at: normalizeNullable(input.startsAt),
      status: "published",
      title: input.title.trim(),
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingContentTableError(error)) {
      throw new Error("Run the business content SQL setup in Supabase first.");
    }

    throw error;
  }

  let contentItem = data as BusinessContentRow;

  if (input.image) {
    try {
      const imageUrl = await uploadBusinessContentImage(
        input.image,
        ownerId,
        input.registrationId,
        contentItem.id,
      );
      const { data: updatedData, error: updateError } = await supabase
        .from("business_content_items")
        .update({ image_url: imageUrl })
        .eq("id", contentItem.id)
        .eq("owner_id", ownerId)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      contentItem = updatedData as BusinessContentRow;
    } catch (uploadError) {
      await supabase
        .from("business_content_items")
        .delete()
        .eq("id", contentItem.id)
        .eq("owner_id", ownerId);
      throw uploadError;
    }
  }

  return mapBusinessContentItem(contentItem);
}

export async function updateBusinessContentItem(
  input: BusinessContentUpdateInput,
  ownerId: string,
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  let nextImageUrl: string | undefined;

  if (input.image) {
    nextImageUrl = await uploadBusinessContentImage(
      input.image,
      ownerId,
      input.registrationId,
      input.id,
    );
  }

  const payload: Partial<BusinessContentRow> = {
    content_type: input.type,
    description: input.description.trim(),
    is_free: input.isFree,
    is_online: input.type === "event" && input.isOnline,
    link_url: input.type === "event" ? normalizeNullable(input.linkUrl) : null,
    location: input.type === "event" ? normalizeNullable(input.location) : null,
    price: input.isFree ? null : normalizeNullable(input.price),
    starts_at: input.type === "event" ? normalizeNullable(input.startsAt) : null,
    title: input.title.trim(),
  };

  if (nextImageUrl) {
    payload.image_url = nextImageUrl;
  }

  const { data, error } = await supabase
    .from("business_content_items")
    .update(payload)
    .eq("id", input.id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) {
    if (isMissingContentTableError(error)) {
      throw new Error("Run the business content SQL setup in Supabase first.");
    }

    throw error;
  }

  return mapBusinessContentItem(data as BusinessContentRow);
}

export async function deleteBusinessContentItem(
  contentItemId: string,
  ownerId: string,
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { error } = await supabase
    .from("business_content_items")
    .delete()
    .eq("id", contentItemId)
    .eq("owner_id", ownerId);

  if (error) {
    if (isMissingContentTableError(error)) {
      throw new Error("Run the business content SQL setup in Supabase first.");
    }

    throw error;
  }
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
      address: normalizeNullable(input.address),
      business_name: input.name.trim(),
      category_slug: input.categorySlug,
      city: input.city.trim(),
      description: input.description.trim(),
      instagram: normalizeNullable(input.instagram),
      owner_id: ownerId,
      phone: normalizeNullable(input.phone),
      serves_all_canada: input.servesAllCanada,
      status: "pending",
      website: normalizeNullable(input.website),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  let registration = data as RegistrationRow;

  if (input.logo) {
    const logoUrl = await uploadBusinessLogo(input.logo, ownerId, registration.id);
    const { data: updatedData, error: updateError } = await supabase
      .from("business_registrations")
      .update({ logo_url: logoUrl })
      .eq("id", registration.id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    registration = updatedData as RegistrationRow;
  }

  return mapRegistration(registration);
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

async function fetchPublishedBusinessContent(registrationIds: string[]) {
  const uniqueRegistrationIds = Array.from(new Set(registrationIds));
  const contentMap = new Map<string, BusinessContentItem[]>();

  if (!uniqueRegistrationIds.length) {
    return contentMap;
  }

  const { data, error } = await supabase
    .from("business_content_items")
    .select("*")
    .in("registration_id", uniqueRegistrationIds)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingContentTableError(error)) {
      return contentMap;
    }

    throw error;
  }

  for (const item of ((data ?? []) as BusinessContentRow[]).map(
    mapBusinessContentItem,
  )) {
    const currentItems = contentMap.get(item.registrationId) ?? [];
    contentMap.set(item.registrationId, [...currentItems, item]);
  }

  return contentMap;
}

function normalizeNullable(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function isMissingContentTableError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    message.includes("business_content_items")
  );
}

const logoBucket = "business-logos";
const contentImageBucket = "business-content-images";
const maxLogoSize = 2 * 1024 * 1024;
const maxContentImageSize = 5 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

async function uploadBusinessLogo(
  logo: BusinessLogoInput,
  ownerId: string,
  registrationId: string,
) {
  return uploadImageToBucket({
    bucket: logoBucket,
    image: logo,
    maxSize: maxLogoSize,
    path: `${ownerId}/${registrationId}/${Date.now()}`,
    sizeError: "Logo must be smaller than 2 MB.",
    typeError: "Logo must be a PNG, JPG, WebP, or GIF image.",
  });
}

async function uploadBusinessContentImage(
  image: BusinessContentImageInput,
  ownerId: string,
  registrationId: string,
  contentItemId: string,
) {
  return uploadImageToBucket({
    bucket: contentImageBucket,
    image,
    maxSize: maxContentImageSize,
    path: `${ownerId}/${registrationId}/${contentItemId}/${Date.now()}`,
    sizeError: "Image must be smaller than 5 MB.",
    typeError: "Image must be a PNG, JPG, WebP, or GIF image.",
  });
}

async function uploadImageToBucket({
  bucket,
  image,
  maxSize,
  path,
  sizeError,
  typeError,
}: {
  bucket: string;
  image: BusinessContentImageInput;
  maxSize: number;
  path: string;
  sizeError: string;
  typeError: string;
}) {
  const mimeType =
    image.mimeType ?? getMimeTypeFromName(image.fileName ?? image.uri) ?? "image/jpeg";
  const extension = allowedImageTypes.get(mimeType);

  if (!extension) {
    throw new Error(typeError);
  }

  const fileBody = image.base64
    ? base64ToArrayBuffer(image.base64)
    : await getImageArrayBuffer(image.uri);

  if (fileBody.byteLength === 0) {
    throw new Error("Image upload produced an empty file. Please choose the image again.");
  }

  if (fileBody.byteLength > maxSize) {
    throw new Error(sizeError);
  }

  const imagePath = `${path}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(imagePath, fileBody, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);

  return data.publicUrl;
}

async function getImageArrayBuffer(uri: string) {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();

  return body;
}

function base64ToArrayBuffer(base64: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const cleanBase64 = base64
    .replace(/[\r\n\s]/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = cleanBase64.endsWith("==")
    ? 2
    : cleanBase64.endsWith("=")
      ? 1
      : 0;
  const bytes = new Uint8Array(Math.floor((cleanBase64.length * 3) / 4) - padding);
  let outputIndex = 0;

  for (let index = 0; index < cleanBase64.length; index += 4) {
    const first = alphabet.indexOf(cleanBase64[index] ?? "A");
    const second = alphabet.indexOf(cleanBase64[index + 1] ?? "A");
    const third =
      cleanBase64[index + 2] === "="
        ? 0
        : alphabet.indexOf(cleanBase64[index + 2] ?? "A");
    const fourth =
      cleanBase64[index + 3] === "="
        ? 0
        : alphabet.indexOf(cleanBase64[index + 3] ?? "A");
    const chunk = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (outputIndex < bytes.length) {
      bytes[outputIndex] = (chunk >> 16) & 255;
      outputIndex += 1;
    }

    if (outputIndex < bytes.length) {
      bytes[outputIndex] = (chunk >> 8) & 255;
      outputIndex += 1;
    }

    if (outputIndex < bytes.length) {
      bytes[outputIndex] = chunk & 255;
      outputIndex += 1;
    }
  }

  return bytes.buffer;
}

function getMimeTypeFromName(value: string) {
  const extension = value.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  return null;
}

function mapPublicBusiness(
  business: PublicBusinessRow,
  owner?: OwnerProfileRow,
  currentUserId?: string,
  contentItems: BusinessContentItem[] = [],
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
    contentItems,
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
    contentItems: [],
  };
}

function mapBusinessContentItem(row: BusinessContentRow): BusinessContentItem {
  return {
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    imageUrl: row.image_url ?? undefined,
    isFree: Boolean(row.is_free),
    isOnline: Boolean(row.is_online),
    linkUrl: row.link_url ?? undefined,
    location: row.location ?? undefined,
    ownerId: row.owner_id,
    price: row.price ?? undefined,
    registrationId: row.registration_id,
    startsAt: row.starts_at ?? undefined,
    status: row.status,
    title: row.title,
    type: row.content_type,
  };
}
