import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const avatarBucket = "profile-avatars";
const maxAvatarSize = 2 * 1024 * 1024;
const allowedAvatarTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function uploadProfileAvatar(
  supabase: SupabaseClient<Database>,
  value: FormDataEntryValue | null,
  ownerId: string,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = allowedAvatarTypes.get(value.type);

  if (!extension) {
    throw new Error("Profile photo must be a PNG, JPG, WebP, or GIF image.");
  }

  if (value.size > maxAvatarSize) {
    throw new Error("Profile photo must be smaller than 2 MB.");
  }

  const path = `${ownerId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(avatarBucket)
    .upload(path, value, {
      contentType: value.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);

  return data.publicUrl;
}
