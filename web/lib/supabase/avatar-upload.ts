import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { prepareImageUpload } from "@/lib/supabase/image-upload";
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
  const upload = await prepareImageUpload(value, {
    allowedTypes: allowedAvatarTypes,
    maxEdge: 900,
    maxSize: maxAvatarSize,
    quality: 78,
    sizeError: "Profile photo must be smaller than 2 MB.",
    typeError: "Profile photo must be a PNG, JPG, WebP, or GIF image.",
  });

  if (!upload) {
    return null;
  }

  const path = `${ownerId}/${randomUUID()}.${upload.extension}`;
  const { error } = await supabase.storage
    .from(avatarBucket)
    .upload(path, upload.body, {
      cacheControl: "31536000",
      contentType: upload.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);

  return data.publicUrl;
}
