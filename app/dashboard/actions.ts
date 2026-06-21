"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type DashboardActionState = {
  ok: boolean;
  message: string;
};

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
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

  const { error } = await supabase
    .from("business_registrations")
    .update({
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
    })
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
