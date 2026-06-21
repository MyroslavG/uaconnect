"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { BusinessRegistrationStatus } from "@/lib/supabase/database.types";

export type RegistrationActionState = {
  ok: boolean;
  message: string;
};

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

export async function submitBusinessRegistration(
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add env vars and restart the server.",
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
      message: "Please sign in with Google before registering a business.",
    };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!businessName || !categorySlug || !city || !description) {
    return {
      ok: false,
      message: "Please fill in the required business details.",
    };
  }

  const status: BusinessRegistrationStatus = "pending";
  const { error } = await supabase.from("business_registrations").insert({
    owner_id: user.id,
    business_name: businessName,
    category_slug: categorySlug,
    city,
    address: optionalText(formData.get("address")),
    description,
    phone: optionalText(formData.get("phone")),
    website: optionalText(formData.get("website")),
    instagram: optionalText(formData.get("instagram")),
    status,
  });

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
    message:
      "Registration submitted. It will stay pending until an admin manually verifies it.",
  };
}
