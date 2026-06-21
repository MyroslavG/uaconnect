"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uploadProfileAvatar } from "@/lib/supabase/avatar-upload";
import { uploadBusinessLogo } from "@/lib/supabase/logo-upload";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type DashboardActionState = {
  ok: boolean;
  message: string;
};

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

type RegistrationUpdate =
  Database["public"]["Tables"]["business_registrations"]["Update"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function updateOwnerProfile(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Please sign in before editing your profile.",
    };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const contactEmail = optionalText(formData.get("contactEmail"));

  if (!fullName) {
    return {
      ok: false,
      message: "Please enter your name.",
    };
  }

  let avatarUrl: string | null = null;

  try {
    avatarUrl = await uploadProfileAvatar(
      supabase,
      formData.get("avatarFile"),
      user.id,
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Profile photo upload failed.",
    };
  }

  const updates: ProfileUpdate = {
    full_name: fullName,
    contact_email: contactEmail,
    email: user.email ?? null,
  };

  if (avatarUrl) {
    updates.avatar_url = avatarUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/");

  return {
    ok: true,
    message: "Profile details saved.",
  };
}

export async function updateBusinessRegistration(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Please sign in before editing your business.",
    };
  }

  const id = String(formData.get("id") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!id || !businessName || !categorySlug || !city || !description) {
    return {
      ok: false,
      message: "Please fill in the required business details.",
    };
  }

  let logoUrl: string | null = null;

  try {
    logoUrl = await uploadBusinessLogo(
      supabase,
      formData.get("logoFile"),
      user.id,
      id,
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Logo upload failed.",
    };
  }

  const updates: RegistrationUpdate = {
    business_name: businessName,
    category_slug: categorySlug,
    city,
    address: optionalText(formData.get("address")),
    description,
    phone: optionalText(formData.get("phone")),
    website: optionalText(formData.get("website")),
    instagram: optionalText(formData.get("instagram")),
    status: "pending",
    reviewer_id: null,
    review_note: null,
    reviewed_at: null,
  };

  if (logoUrl) {
    updates.logo_url = logoUrl;
  }

  const { error } = await supabase
    .from("business_registrations")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/registrations");

  return {
    ok: true,
    message: "Business details saved.",
  };
}
