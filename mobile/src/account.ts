import { isSupabaseConfigured, supabase } from "./supabase";

export type UserProfile = {
  id: string;
  email?: string;
  contactEmail?: string;
  fullName?: string;
  avatarUrl?: string;
};

export type ProfileAvatarInput = {
  base64?: string | null;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export type ProfileUpdateInput = {
  fullName: string;
  contactEmail?: string;
  avatar?: ProfileAvatarInput | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  contact_email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const avatarBucket = "profile-avatars";
const maxAvatarSize = 2 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function fetchCurrentProfile(userId: string) {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, contact_email, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProfile(data as ProfileRow) : null;
}

export async function updateCurrentProfile(
  input: ProfileUpdateInput,
  userId: string,
  authEmail?: string,
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error("Please enter your name.");
  }

  let avatarUrl: string | undefined;

  if (input.avatar) {
    avatarUrl = await uploadProfileAvatar(input.avatar, userId);
  }

  const updates: Partial<ProfileRow> = {
    contact_email: normalizeNullable(input.contactEmail),
    email: normalizeNullable(authEmail),
    full_name: fullName,
  };

  if (avatarUrl) {
    updates.avatar_url = avatarUrl;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id, email, contact_email, full_name, avatar_url")
    .single();

  if (error) {
    throw error;
  }

  const metadataUpdates: Record<string, string> = {
    full_name: fullName,
    name: fullName,
  };

  if (avatarUrl) {
    metadataUpdates.avatar_url = avatarUrl;
    metadataUpdates.picture = avatarUrl;
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: metadataUpdates,
  });

  if (metadataError) {
    throw metadataError;
  }

  return mapProfile(data as ProfileRow);
}

export async function deleteCurrentAccount() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { error } = await supabase.rpc("delete_current_user_account");

  if (error) {
    throw error;
  }

  await supabase.auth.signOut();
}

async function uploadProfileAvatar(avatar: ProfileAvatarInput, userId: string) {
  const mimeType =
    avatar.mimeType ??
    getMimeTypeFromName(avatar.fileName ?? avatar.uri) ??
    "image/jpeg";
  const extension = allowedImageTypes.get(mimeType);

  if (!extension) {
    throw new Error("Profile photo must be a PNG, JPG, WebP, or GIF image.");
  }

  const fileBody = avatar.base64
    ? base64ToArrayBuffer(avatar.base64)
    : await getImageArrayBuffer(avatar.uri);

  if (fileBody.byteLength === 0) {
    throw new Error("Image upload produced an empty file. Please choose the image again.");
  }

  if (fileBody.byteLength > maxAvatarSize) {
    throw new Error("Profile photo must be smaller than 2 MB.");
  }

  const imagePath = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(avatarBucket)
    .upload(imagePath, fileBody, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(imagePath);

  return data.publicUrl;
}

async function getImageArrayBuffer(uri: string) {
  const response = await fetch(uri);

  return response.arrayBuffer();
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

function normalizeNullable(value?: string) {
  const trimmed = value?.trim() ?? "";

  return trimmed ? trimmed : null;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    avatarUrl: row.avatar_url ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    email: row.email ?? undefined,
    fullName: row.full_name ?? undefined,
    id: row.id,
  };
}
