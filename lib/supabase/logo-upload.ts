import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const logoBucket = "business-logos";
const maxLogoSize = 2 * 1024 * 1024;
const allowedLogoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
]);

export async function uploadBusinessLogo(
  supabase: SupabaseClient<Database>,
  value: FormDataEntryValue | null,
  ownerId: string,
  scopeId: string,
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const extension = allowedLogoTypes.get(value.type);

  if (!extension) {
    throw new Error("Logo must be a PNG, JPG, WebP, GIF, or SVG image.");
  }

  if (value.size > maxLogoSize) {
    throw new Error("Logo must be smaller than 2 MB.");
  }

  const path = `${ownerId}/${scopeId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(logoBucket).upload(path, value, {
    contentType: value.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);

  return data.publicUrl;
}
