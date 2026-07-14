"use server";

import { revalidatePath } from "next/cache";

import { logServerError, logServerEvent } from "@/lib/diagnostics";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uploadProfileAvatar } from "@/lib/supabase/avatar-upload";
import { uploadBusinessContentImage } from "@/lib/supabase/content-image-upload";
import { uploadBusinessLogo } from "@/lib/supabase/logo-upload";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessContentType,
  Database,
} from "@/lib/supabase/database.types";

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
type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type BusinessContentInsert =
  Database["public"]["Tables"]["business_content_items"]["Insert"];
type BusinessContentUpdate =
  Database["public"]["Tables"]["business_content_items"]["Update"];

export async function updateOwnerProfile(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  if (!isSupabaseConfigured()) {
    logServerEvent("owner_profile.not_configured");

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
    logServerError("owner_profile.auth_failed", userError, {
      hasUser: Boolean(user),
    });

    return {
      ok: false,
      message: "Please sign in before editing your profile.",
    };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const contactEmail = optionalText(formData.get("contactEmail"));

  if (!fullName) {
    logServerEvent("owner_profile.validation_failed", {
      missing: { fullName: true },
      userId: user.id,
    });

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
    logServerError("owner_profile.avatar_upload_failed", error, {
      userId: user.id,
    });

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
    logServerError("owner_profile.update_failed", error, {
      userId: user.id,
    });

    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/");

  logServerEvent("owner_profile.updated", {
    hasAvatar: Boolean(avatarUrl),
    userId: user.id,
  });

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
    logServerEvent("business_update.not_configured");

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
    logServerError("business_update.auth_failed", userError, {
      hasUser: Boolean(user),
    });

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
  const servesAllCanada = formData.get("servesAllCanada") === "on";

  if (!id || !businessName || !categorySlug || !city || !description) {
    logServerEvent("business_update.validation_failed", {
      missing: {
        businessName: !businessName,
        categorySlug: !categorySlug,
        city: !city,
        description: !description,
        id: !id,
      },
      registrationId: id,
      userId: user.id,
    });

    return {
      ok: false,
      message: "Please fill in the required business details.",
    };
  }

  const { data: existingRegistration, error: registrationError } = await supabase
    .from("business_registrations")
    .select("status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (registrationError || !existingRegistration) {
    logServerError("business_update.registration_read_failed", registrationError, {
      registrationId: id,
      userId: user.id,
    });

    return {
      ok: false,
      message: registrationError?.message ?? "Business registration not found.",
    };
  }

  const { data: linkedBusiness, error: linkedBusinessError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("registration_id", id)
    .limit(1)
    .maybeSingle();

  if (linkedBusinessError) {
    logServerError("business_update.linked_business_read_failed", linkedBusinessError, {
      registrationId: id,
      userId: user.id,
    });

    return {
      ok: false,
      message: linkedBusinessError.message,
    };
  }

  const isPublishedUpdate =
    existingRegistration.status === "approved" || Boolean(linkedBusiness);
  const shouldRefreshAdmin =
    !isPublishedUpdate || existingRegistration.status !== "approved";
  let logoUrl: string | null = null;

  try {
    logoUrl = await uploadBusinessLogo(
      supabase,
      formData.get("logoFile"),
      user.id,
      id,
    );
  } catch (error) {
    logServerError("business_update.logo_upload_failed", error, {
      registrationId: id,
      userId: user.id,
    });

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
    serves_all_canada: servesAllCanada,
    description,
    phone: optionalText(formData.get("phone")),
    website: optionalText(formData.get("website")),
    instagram: optionalText(formData.get("instagram")),
    status: isPublishedUpdate ? "approved" : "pending",
  };

  if (!isPublishedUpdate) {
    updates.reviewer_id = null;
    updates.review_note = null;
    updates.reviewed_at = null;
  }

  if (logoUrl) {
    updates.logo_url = logoUrl;
  }

  const { data: updatedRegistration, error } = await supabase
    .from("business_registrations")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (error || !updatedRegistration) {
    logServerError("business_update.registration_update_failed", error, {
      categorySlug,
      city,
      servesAllCanada,
      isPublishedUpdate,
      registrationId: id,
      userId: user.id,
    });

    return {
      ok: false,
      message:
        error?.message ??
        "No business was updated. Make sure this Google account owns the business.",
    };
  }

  let publicBusinessSlug = linkedBusiness?.slug ?? null;

  if (isPublishedUpdate) {
    const businessUpdates: BusinessUpdate = {
      owner_id: user.id,
      name: businessName,
      category_slug: categorySlug,
      city,
      address: optionalText(formData.get("address")) ?? "",
      serves_all_canada: servesAllCanada,
      description,
      phone: optionalText(formData.get("phone")),
      website: optionalText(formData.get("website")),
      instagram: optionalText(formData.get("instagram")),
      status: "published",
    };

    if (logoUrl) {
      businessUpdates.logo_url = logoUrl;
    }

    const { data: syncedBusiness, error: syncError } = await supabase
      .from("businesses")
      .update(businessUpdates)
      .eq("registration_id", id)
      .eq("owner_id", user.id)
      .select("slug")
      .single();

    if (syncError || !syncedBusiness) {
      logServerError("business_update.public_sync_failed", syncError, {
        categorySlug,
        city,
        servesAllCanada,
        registrationId: id,
        userId: user.id,
      });

      return {
        ok: false,
        message:
          syncError?.message ??
          "Business details were saved, but the public profile was not updated.",
      };
    }

    publicBusinessSlug = syncedBusiness.slug ?? publicBusinessSlug;
  }

  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/search");

  if (publicBusinessSlug) {
    revalidatePath(`/business/${publicBusinessSlug}`);
  }

  if (shouldRefreshAdmin) {
    revalidatePath("/admin/registrations");
  }

  logServerEvent("business_update.updated", {
    categorySlug,
    city,
    servesAllCanada,
    isPublishedUpdate,
    publicBusinessSlug,
    registrationId: id,
    userId: user.id,
  });

  return {
    ok: true,
    message: isPublishedUpdate
      ? "Business profile updated."
      : "Business details saved for review.",
  };
}

export async function createBusinessContentItem(
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
    logServerError("business_content.create_auth_failed", userError, {
      hasUser: Boolean(user),
    });

    return {
      ok: false,
      message: "Please sign in before adding content.",
    };
  }

  const input = getBusinessContentInput(formData);

  if (!input.registrationId || !input.title || !input.description) {
    return {
      ok: false,
      message: "Please add a title and description.",
    };
  }

  if (input.type === "event" && !input.startsAt) {
    return {
      ok: false,
      message: "Please choose the event date and time.",
    };
  }

  const registration = await getOwnedRegistration(
    supabase,
    input.registrationId,
    user.id,
  );

  if (!registration.ok) {
    return registration.state;
  }

  const payload: BusinessContentInsert = {
    content_type: input.type,
    description: input.description,
    image_url: null,
    is_free: input.isFree,
    is_online: input.type === "event" && input.isOnline,
    link_url: input.type === "event" ? input.linkUrl : null,
    location: input.type === "event" ? input.location : null,
    owner_id: user.id,
    price: input.isFree ? null : input.price,
    registration_id: input.registrationId,
    starts_at: input.type === "event" ? input.startsAt : null,
    status: "published",
    title: input.title,
  };

  const { data: createdItem, error } = await supabase
    .from("business_content_items")
    .insert(payload)
    .select("id")
    .single();

  if (error || !createdItem) {
    logServerError("business_content.create_failed", error, {
      registrationId: input.registrationId,
      type: input.type,
      userId: user.id,
    });

    return {
      ok: false,
      message: error?.message ?? "Content item could not be created.",
    };
  }

  try {
    const imageUrl = await uploadBusinessContentImage(
      supabase,
      formData.get("imageFile"),
      user.id,
      input.registrationId,
      createdItem.id,
    );

    if (imageUrl) {
      const { error: imageUpdateError } = await supabase
        .from("business_content_items")
        .update({ image_url: imageUrl })
        .eq("id", createdItem.id)
        .eq("owner_id", user.id);

      if (imageUpdateError) {
        throw imageUpdateError;
      }
    }
  } catch (imageError) {
    await supabase
      .from("business_content_items")
      .delete()
      .eq("id", createdItem.id)
      .eq("owner_id", user.id);

    logServerError("business_content.image_upload_failed", imageError, {
      contentItemId: createdItem.id,
      registrationId: input.registrationId,
      userId: user.id,
    });

    return {
      ok: false,
      message:
        imageError instanceof Error
          ? imageError.message
          : "Image upload failed.",
    };
  }

  revalidateBusinessContentPaths(input.registrationId, registration.slug);

  logServerEvent("business_content.created", {
    contentItemId: createdItem.id,
    registrationId: input.registrationId,
    type: input.type,
    userId: user.id,
  });

  return {
    ok: true,
    message: input.type === "event" ? "Event added." : "Service added.",
  };
}

export async function updateBusinessContentItem(
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
    logServerError("business_content.update_auth_failed", userError, {
      hasUser: Boolean(user),
    });

    return {
      ok: false,
      message: "Please sign in before editing content.",
    };
  }

  const id = String(formData.get("contentId") ?? "").trim();
  const input = getBusinessContentInput(formData);

  if (!id || !input.registrationId || !input.title || !input.description) {
    return {
      ok: false,
      message: "Please add a title and description.",
    };
  }

  if (input.type === "event" && !input.startsAt) {
    return {
      ok: false,
      message: "Please choose the event date and time.",
    };
  }

  const registration = await getOwnedRegistration(
    supabase,
    input.registrationId,
    user.id,
  );

  if (!registration.ok) {
    return registration.state;
  }

  const updates: BusinessContentUpdate = {
    content_type: input.type,
    description: input.description,
    is_free: input.isFree,
    is_online: input.type === "event" && input.isOnline,
    link_url: input.type === "event" ? input.linkUrl : null,
    location: input.type === "event" ? input.location : null,
    price: input.isFree ? null : input.price,
    starts_at: input.type === "event" ? input.startsAt : null,
    title: input.title,
  };

  try {
    const imageUrl = await uploadBusinessContentImage(
      supabase,
      formData.get("imageFile"),
      user.id,
      input.registrationId,
      id,
    );

    if (imageUrl) {
      updates.image_url = imageUrl;
    }
  } catch (imageError) {
    logServerError("business_content.update_image_failed", imageError, {
      contentItemId: id,
      registrationId: input.registrationId,
      userId: user.id,
    });

    return {
      ok: false,
      message:
        imageError instanceof Error
          ? imageError.message
          : "Image upload failed.",
    };
  }

  const { error } = await supabase
    .from("business_content_items")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("registration_id", input.registrationId);

  if (error) {
    logServerError("business_content.update_failed", error, {
      contentItemId: id,
      registrationId: input.registrationId,
      type: input.type,
      userId: user.id,
    });

    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateBusinessContentPaths(input.registrationId, registration.slug);

  logServerEvent("business_content.updated", {
    contentItemId: id,
    registrationId: input.registrationId,
    type: input.type,
    userId: user.id,
  });

  return {
    ok: true,
    message: input.type === "event" ? "Event updated." : "Service updated.",
  };
}

export async function deleteBusinessContentItem(
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
    logServerError("business_content.delete_auth_failed", userError, {
      hasUser: Boolean(user),
    });

    return {
      ok: false,
      message: "Please sign in before deleting content.",
    };
  }

  const id = String(formData.get("contentId") ?? "").trim();
  const registrationId = String(formData.get("registrationId") ?? "").trim();

  if (!id || !registrationId) {
    return {
      ok: false,
      message: "Content item was not found.",
    };
  }

  const registration = await getOwnedRegistration(
    supabase,
    registrationId,
    user.id,
  );

  if (!registration.ok) {
    return registration.state;
  }

  const { error } = await supabase
    .from("business_content_items")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("registration_id", registrationId);

  if (error) {
    logServerError("business_content.delete_failed", error, {
      contentItemId: id,
      registrationId,
      userId: user.id,
    });

    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateBusinessContentPaths(registrationId, registration.slug);

  logServerEvent("business_content.deleted", {
    contentItemId: id,
    registrationId,
    userId: user.id,
  });

  return {
    ok: true,
    message: "Item deleted.",
  };
}

function getBusinessContentInput(formData: FormData) {
  const rawType = String(formData.get("contentType") ?? "").trim();
  const type: BusinessContentType = rawType === "event" ? "event" : "service";
  const isFree = formData.get("isFree") === "on";

  return {
    description: String(formData.get("description") ?? "").trim(),
    isFree,
    isOnline: formData.get("isOnline") === "on",
    linkUrl: type === "event" ? optionalText(formData.get("linkUrl")) : null,
    location: type === "event" ? optionalText(formData.get("location")) : null,
    price: isFree ? null : optionalText(formData.get("price")),
    registrationId: String(formData.get("registrationId") ?? "").trim(),
    startsAt: type === "event" ? optionalText(formData.get("startsAt")) : null,
    title: String(formData.get("title") ?? "").trim(),
    type,
  };
}

async function getOwnedRegistration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  registrationId: string,
  userId: string,
): Promise<
  | {
      ok: true;
      slug: string | null;
    }
  | {
      ok: false;
      state: DashboardActionState;
    }
> {
  const [{ data: registration, error }, { data: linkedBusiness }] =
    await Promise.all([
      supabase
        .from("business_registrations")
        .select("id")
        .eq("id", registrationId)
        .eq("owner_id", userId)
        .maybeSingle(),
      supabase
        .from("businesses")
        .select("slug")
        .eq("registration_id", registrationId)
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);

  if (error || !registration) {
    logServerError("business_content.registration_read_failed", error, {
      registrationId,
      userId,
    });

    return {
      ok: false,
      state: {
        ok: false,
        message:
          error?.message ??
          "Business registration not found for this Google account.",
      },
    };
  }

  return {
    ok: true,
    slug: linkedBusiness?.slug ?? null,
  };
}

function revalidateBusinessContentPaths(
  registrationId: string,
  publicBusinessSlug: string | null,
) {
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/search");

  if (publicBusinessSlug) {
    revalidatePath(`/business/${publicBusinessSlug}`);
  }
}
