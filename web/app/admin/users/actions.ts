"use server";

import { revalidatePath } from "next/cache";

import { uploadBusinessLogo } from "@/lib/supabase/logo-upload";
import { uploadProfileAvatar } from "@/lib/supabase/avatar-upload";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Database } from "@/lib/supabase/database.types";

export type AdminUserActionState = {
  ok: boolean;
  message: string;
};

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type RegistrationInsert =
  Database["public"]["Tables"]["business_registrations"]["Insert"];
type RegistrationUpdate =
  Database["public"]["Tables"]["business_registrations"]["Update"];
type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

function normalizeRole(value: FormDataEntryValue | null): AppRole | null {
  return value === "admin" || value === "user" ? value : null;
}

export async function updateAdminUserProfile(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const [adminUser, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!adminUser || !isAdmin) {
    return {
      ok: false,
      message: "Only admins can edit users.",
    };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const role = normalizeRole(formData.get("role"));

  if (!userId || !role) {
    return {
      ok: false,
      message: "Choose a user and role.",
    };
  }

  if (userId === adminUser.id && role !== "admin") {
    return {
      ok: false,
      message: "You cannot remove your own admin access.",
    };
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return {
      ok: false,
      message: profileError?.message ?? "User profile not found.",
    };
  }

  if (profile.role === "admin" && role === "user") {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return {
        ok: false,
        message: countError.message,
      };
    }

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: "At least one admin account must remain.",
      };
    }
  }

  let avatarUrl: string | null = null;

  try {
    avatarUrl = await uploadProfileAvatar(
      supabase,
      formData.get("avatarFile"),
      userId,
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Profile photo upload failed.",
    };
  }

  const updates: ProfileUpdate = {
    full_name: optionalText(formData.get("fullName")),
    contact_email: optionalText(formData.get("contactEmail")),
    role,
  };

  if (avatarUrl) {
    updates.avatar_url = avatarUrl;
  } else if (formData.get("clearAvatar") === "on") {
    updates.avatar_url = null;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id")
    .single();

  if (updateError) {
    return {
      ok: false,
      message: updateError.message,
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/");

  return {
    ok: true,
    message: "User profile updated.",
  };
}

export async function transferBusinessOwnership(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const [adminUser, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!adminUser || !isAdmin) {
    return {
      ok: false,
      message: "Only admins can transfer business ownership.",
    };
  }

  const registrationId = String(formData.get("registrationId") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim();

  if (!registrationId || !ownerId) {
    return {
      ok: false,
      message: "Choose a business and the new owner.",
    };
  }

  const supabase = await createClient();
  const [
    { data: registration, error: registrationError },
    { data: ownerProfile, error: ownerError },
    { data: linkedBusiness, error: linkedBusinessError },
  ] = await Promise.all([
    supabase
      .from("business_registrations")
      .select("id, business_name, owner_id")
      .eq("id", registrationId)
      .single(),
    supabase.from("profiles").select("id, email").eq("id", ownerId).single(),
    supabase
      .from("businesses")
      .select("id, slug, owner_id")
      .eq("registration_id", registrationId)
      .maybeSingle(),
  ]);

  if (registrationError || !registration) {
    return {
      ok: false,
      message: registrationError?.message ?? "Business registration not found.",
    };
  }

  if (ownerError || !ownerProfile) {
    return {
      ok: false,
      message: ownerError?.message ?? "New owner profile not found.",
    };
  }

  if (linkedBusinessError) {
    return {
      ok: false,
      message: linkedBusinessError.message,
    };
  }

  const { error: registrationUpdateError } = await supabase
    .from("business_registrations")
    .update({ owner_id: ownerId })
    .eq("id", registrationId);

  if (registrationUpdateError) {
    return {
      ok: false,
      message: registrationUpdateError.message,
    };
  }

  if (linkedBusiness) {
    const { error: businessUpdateError } = await supabase
      .from("businesses")
      .update({ owner_id: ownerId })
      .eq("id", linkedBusiness.id);

    if (businessUpdateError) {
      return {
        ok: false,
        message: businessUpdateError.message,
      };
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/");

  if (linkedBusiness?.slug) {
    revalidatePath(`/business/${linkedBusiness.slug}`);
  }

  return {
    ok: true,
    message: `Ownership transferred to ${ownerProfile.email ?? "selected user"}.`,
  };
}

export async function connectPublicBusinessToOwner(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const [adminUser, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!adminUser || !isAdmin) {
    return {
      ok: false,
      message: "Only admins can connect businesses.",
    };
  }

  const businessId = String(formData.get("businessId") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim();

  if (!businessId || !ownerId) {
    return {
      ok: false,
      message: "Choose a business and owner.",
    };
  }

  const supabase = await createClient();
  const [
    { data: business, error: businessError },
    { data: ownerProfile, error: ownerError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single(),
    supabase.from("profiles").select("id, email").eq("id", ownerId).single(),
  ]);

  if (businessError || !business) {
    return {
      ok: false,
      message: businessError?.message ?? "Business not found.",
    };
  }

  if (ownerError || !ownerProfile) {
    return {
      ok: false,
      message: ownerError?.message ?? "Owner profile not found.",
    };
  }

  if (business.registration_id) {
    return {
      ok: false,
      message: "This business is already connected to a registration.",
    };
  }

  const reviewedAt = new Date().toISOString();
  const registrationInsert: RegistrationInsert = {
    owner_id: ownerId,
    business_name: business.name,
    category_slug: business.category_slug,
    city: business.city,
    address: business.address || null,
    phone: business.phone,
    website: business.website,
    instagram: business.instagram,
    logo_url: business.logo_url,
    serves_all_canada: business.serves_all_canada,
    description: business.description,
    status: "approved",
    reviewer_id: adminUser.id,
    reviewed_at: reviewedAt,
  };
  const { data: registration, error: registrationError } = await supabase
    .from("business_registrations")
    .insert(registrationInsert)
    .select("id")
    .single();

  if (registrationError || !registration) {
    return {
      ok: false,
      message:
        registrationError?.message ?? "Could not create business registration.",
    };
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      owner_id: ownerId,
      registration_id: registration.id,
      status: "published",
      verified_at: business.verified_at ?? reviewedAt,
    })
    .eq("id", business.id);

  if (updateError) {
    return {
      ok: false,
      message: updateError.message,
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/");

  if (business.slug) {
    revalidatePath(`/business/${business.slug}`);
  }

  return {
    ok: true,
    message: `Business connected to ${ownerProfile.email ?? "selected user"}.`,
  };
}

export async function updateAdminBusinessDetails(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const [adminUser, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!adminUser || !isAdmin) {
    return {
      ok: false,
      message: "Only admins can edit businesses.",
    };
  }

  const registrationId = String(formData.get("registrationId") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const servesAllCanada = formData.get("servesAllCanada") === "on";

  if (
    !registrationId ||
    !businessName ||
    !categorySlug ||
    !city ||
    !description
  ) {
    return {
      ok: false,
      message: "Fill in business name, category, city, and description.",
    };
  }

  const supabase = await createClient();
  const { data: registration, error: registrationError } = await supabase
    .from("business_registrations")
    .select("id, owner_id, status")
    .eq("id", registrationId)
    .single();

  if (registrationError || !registration) {
    return {
      ok: false,
      message: registrationError?.message ?? "Business registration not found.",
    };
  }

  const { data: linkedBusiness, error: linkedBusinessError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("registration_id", registrationId)
    .maybeSingle();

  if (linkedBusinessError) {
    return {
      ok: false,
      message: linkedBusinessError.message,
    };
  }

  let logoUrl: string | null = null;

  try {
    logoUrl = await uploadBusinessLogo(
      supabase,
      formData.get("logoFile"),
      registration.owner_id,
      registrationId,
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Logo upload failed.",
    };
  }

  const registrationUpdates: RegistrationUpdate = {
    business_name: businessName,
    category_slug: categorySlug,
    city,
    address: optionalText(formData.get("address")),
    serves_all_canada: servesAllCanada,
    description,
    phone: optionalText(formData.get("phone")),
    website: optionalText(formData.get("website")),
    instagram: optionalText(formData.get("instagram")),
  };

  if (logoUrl) {
    registrationUpdates.logo_url = logoUrl;
  }

  const { error: registrationUpdateError } = await supabase
    .from("business_registrations")
    .update(registrationUpdates)
    .eq("id", registrationId);

  if (registrationUpdateError) {
    return {
      ok: false,
      message: registrationUpdateError.message,
    };
  }

  if (linkedBusiness) {
    const businessUpdates: BusinessUpdate = {
      name: businessName,
      category_slug: categorySlug,
      city,
      address: optionalText(formData.get("address")) ?? "",
      serves_all_canada: servesAllCanada,
      description,
      phone: optionalText(formData.get("phone")),
      website: optionalText(formData.get("website")),
      instagram: optionalText(formData.get("instagram")),
      status: registration.status === "approved" ? "published" : "hidden",
    };

    if (logoUrl) {
      businessUpdates.logo_url = logoUrl;
    }

    const { error: businessUpdateError } = await supabase
      .from("businesses")
      .update(businessUpdates)
      .eq("id", linkedBusiness.id);

    if (businessUpdateError) {
      return {
        ok: false,
        message: businessUpdateError.message,
      };
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/");

  if (linkedBusiness?.slug) {
    revalidatePath(`/business/${linkedBusiness.slug}`);
  }

  return {
    ok: true,
    message: linkedBusiness
      ? "Business details updated."
      : "Business registration updated. No public profile is linked yet.",
  };
}
