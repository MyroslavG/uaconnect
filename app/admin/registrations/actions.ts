"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { BusinessRegistrationStatus } from "@/lib/supabase/database.types";
import { slugify } from "@/lib/utils";

async function reviewRegistration(formData: FormData, status: BusinessRegistrationStatus) {
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user || !isAdmin) {
    throw new Error("Only admins can review business registrations.");
  }

  const id = String(formData.get("id") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;

  if (!id) {
    throw new Error("Missing registration id.");
  }

  const supabase = await createClient();
  const { data: registration, error: readError } = await supabase
    .from("business_registrations")
    .select("*")
    .eq("id", id)
    .single();

  if (readError || !registration) {
    throw new Error(readError?.message ?? "Registration not found.");
  }

  const reviewedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("business_registrations")
    .update({
      status,
      reviewer_id: user.id,
      review_note: reviewNote,
      reviewed_at: reviewedAt,
    })
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (status === "approved") {
    const baseSlug = slugify(`${registration.business_name}-${registration.city}`);
    const { error: publishError } = await supabase.from("businesses").upsert(
      {
        registration_id: registration.id,
        owner_id: registration.owner_id,
        slug: baseSlug,
        name: registration.business_name,
        category_slug: registration.category_slug,
        city: registration.city,
        address: registration.address ?? "",
        phone: registration.phone,
        website: registration.website,
        instagram: registration.instagram,
        description: registration.description,
        status: "published",
        verified_at: reviewedAt,
      },
      { onConflict: "registration_id" },
    );

    if (publishError) {
      throw new Error(publishError.message);
    }
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard");
}

export async function approveRegistration(formData: FormData) {
  await reviewRegistration(formData, "approved");
}

export async function rejectRegistration(formData: FormData) {
  await reviewRegistration(formData, "rejected");
}
