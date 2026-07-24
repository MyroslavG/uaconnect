import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const contentImageBucket = "business-content-images";
const maxContentImageSize = 5 * 1024 * 1024;
const allowedContentImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function uploadBusinessContentImage(
  supabase: SupabaseClient<Database>,
  value: FormDataEntryValue | null,
  ownerId: string,
  registrationId: string,
  contentItemId: string,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = allowedContentImageTypes.get(value.type);

  if (!extension) {
    throw new Error("Image must be a PNG, JPG, WebP, or GIF image.");
  }

  if (value.size > maxContentImageSize) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const path = `${ownerId}/${registrationId}/${contentItemId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(contentImageBucket)
    .upload(path, value, {
      contentType: value.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(contentImageBucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadBusinessContentImages(
  supabase: SupabaseClient<Database>,
  values: FormDataEntryValue[],
  ownerId: string,
  registrationId: string,
  contentItemId: string,
) {
  const imageUrls: string[] = [];

  for (const value of values) {
    const imageUrl = await uploadBusinessContentImage(
      supabase,
      value,
      ownerId,
      registrationId,
      contentItemId,
    );

    if (imageUrl) {
      imageUrls.push(imageUrl);
    }
  }

  return imageUrls;
}
