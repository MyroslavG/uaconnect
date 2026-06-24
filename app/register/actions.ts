"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { logServerError, logServerEvent } from "@/lib/diagnostics";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uploadBusinessLogo } from "@/lib/supabase/logo-upload";
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
    logServerEvent("business_registration.not_configured");

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
    logServerError("business_registration.auth_failed", userError, {
      hasUser: Boolean(user),
    });

    return {
      ok: false,
      message: "Please sign in with Google before registering a business.",
    };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const servesAllCanada = formData.get("servesAllCanada") === "on";

  if (!businessName || !categorySlug || !city || !description) {
    logServerEvent("business_registration.validation_failed", {
      missing: {
        businessName: !businessName,
        categorySlug: !categorySlug,
        city: !city,
        description: !description,
      },
      userId: user.id,
    });

    return {
      ok: false,
      message: "Please fill in the required business details.",
    };
  }

  const status: BusinessRegistrationStatus = "pending";
  const registrationId = randomUUID();
  let logoUrl: string | null = null;

  try {
    logoUrl = await uploadBusinessLogo(
      supabase,
      formData.get("logoFile"),
      user.id,
      registrationId,
    );
  } catch (error) {
    logServerError("business_registration.logo_upload_failed", error, {
      registrationId,
      userId: user.id,
    });

    return {
      ok: false,
      message: error instanceof Error ? error.message : "Logo upload failed.",
    };
  }

  const { error } = await supabase.from("business_registrations").insert({
    id: registrationId,
    owner_id: user.id,
    business_name: businessName,
    category_slug: categorySlug,
    city,
    address: optionalText(formData.get("address")),
    serves_all_canada: servesAllCanada,
    description,
    phone: optionalText(formData.get("phone")),
    website: optionalText(formData.get("website")),
    instagram: optionalText(formData.get("instagram")),
    logo_url: logoUrl,
    status,
  });

  if (error) {
    logServerError("business_registration.insert_failed", error, {
      categorySlug,
      city,
      servesAllCanada,
      registrationId,
      userId: user.id,
    });

    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/registrations");

  logServerEvent("business_registration.submitted", {
    categorySlug,
    city,
    servesAllCanada,
    registrationId,
    userId: user.id,
  });

  return {
    ok: true,
    message:
      "Registration submitted. It will stay pending until an admin manually verifies it.",
  };
}
