import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { prepareImageUpload } from "@/lib/supabase/image-upload";
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
  const upload = await prepareImageUpload(value, {
    allowedTypes: allowedLogoTypes,
    maxEdge: 900,
    maxSize: maxLogoSize,
    quality: 78,
    sizeError: "Logo must be smaller than 2 MB.",
    typeError: "Logo must be a PNG, JPG, WebP, GIF, or SVG image.",
  });

  if (!upload) {
    return null;
  }

  const path = `${ownerId}/${scopeId}/${randomUUID()}.${upload.extension}`;
  const { error } = await supabase.storage.from(logoBucket).upload(path, upload.body, {
    cacheControl: "31536000",
    contentType: upload.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);

  return data.publicUrl;
}
