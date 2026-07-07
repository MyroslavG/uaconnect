"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { uploadBusinessLogo } from "@/lib/supabase/logo-upload";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessRegistrationStatus,
  Database,
} from "@/lib/supabase/database.types";
import { slugify } from "@/lib/utils";

type AdminBusinessActionState = {
  ok: boolean;
  message: string;
  businessId?: string;
  claimUrl?: string;
  createdBusiness?: {
    id: string;
    city: string;
    name: string;
  };
  ownerEmail?: string;
};

type RegistrationRow =
  Database["public"]["Tables"]["business_registrations"]["Row"];
type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];

export type ReviewActionState = {
  ok: boolean;
  message: string;
};

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

async function requireAdmin() {
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user || !isAdmin) {
    throw new Error("Only admins can manage businesses.");
  }

  return user;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
    /\/$/,
    "",
  );
  const forwardedHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";

  return (
    requestHeaders.get("origin") ??
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : null) ??
    configuredOrigin ??
    "http://localhost:3000"
  );
}

async function getUniqueBusinessSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string,
) {
  const cleanBaseSlug = baseSlug || "business";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate =
      attempt === 0 ? cleanBaseSlug : `${cleanBaseSlug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${cleanBaseSlug}-${Date.now()}`;
}

async function publishRegistrationBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  registration: RegistrationRow,
  verifiedAt: string,
) {
  const { data: existingBusiness, error: existingBusinessError } = await supabase
    .from("businesses")
    .select("slug")
    .eq("registration_id", registration.id)
    .maybeSingle();

  if (existingBusinessError) {
    throw new Error(existingBusinessError.message);
  }

  const slug =
    existingBusiness?.slug ??
    (await getUniqueBusinessSlug(
      supabase,
      slugify(`${registration.business_name}-${registration.city}`),
    ));
  const payload: BusinessInsert = {
    registration_id: registration.id,
    owner_id: registration.owner_id,
    slug,
    name: registration.business_name,
    category_slug: registration.category_slug,
    city: registration.city,
    address: registration.address ?? "",
    phone: registration.phone,
    website: registration.website,
    instagram: registration.instagram,
    logo_url: registration.logo_url,
    serves_all_canada: registration.serves_all_canada,
    description: registration.description,
    status: "published",
    verified_at: verifiedAt,
  };
  const { error: publishError } = await supabase
    .from("businesses")
    .upsert(payload, { onConflict: "registration_id" });

  if (publishError) {
    throw new Error(publishError.message);
  }

  return slug;
}

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
    const slug = await publishRegistrationBusiness(
      supabase,
      registration,
      reviewedAt,
    );
    revalidatePath(`/business/${slug}`);
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/search");
}

export async function approveRegistration(formData: FormData) {
  await reviewRegistration(formData, "approved");
}

export async function rejectRegistration(formData: FormData) {
  await reviewRegistration(formData, "rejected");
}

export async function reviewBusinessRegistration(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const status = String(formData.get("status") ?? "");

  if (status !== "approved" && status !== "rejected") {
    return {
      ok: false,
      message: "Choose whether to approve or reject this business.",
    };
  }

  try {
    await reviewRegistration(formData, status);

    return {
      ok: true,
      message:
        status === "approved"
          ? "Business approved and published."
          : "Business rejected.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to review this business.",
    };
  }
}

export async function createAdminBusiness(
  _previousState: AdminBusinessActionState,
  formData: FormData,
): Promise<AdminBusinessActionState> {
  try {
    const user = await requireAdmin();

    const businessName = String(formData.get("businessName") ?? "").trim();
    const categorySlug = String(formData.get("categorySlug") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const servesAllCanada = formData.get("servesAllCanada") === "on";

    if (!businessName || !categorySlug || !city || !description) {
      return {
        ok: false,
        message: "Fill in business name, category, city, and description.",
      };
    }

    const supabase = await createClient();
    const slug = await getUniqueBusinessSlug(
      supabase,
      slugify(`${businessName}-${city}`),
    );
    const businessId = randomUUID();
    const logoUrl = await uploadBusinessLogo(
      supabase,
      formData.get("logoFile"),
      user.id,
      businessId,
    );
    const { error } = await supabase.from("businesses").insert({
      id: businessId,
      owner_id: null,
      registration_id: null,
      slug,
      name: businessName,
      category_slug: categorySlug,
      city,
      address: optionalText(formData.get("address")) ?? "",
      phone: optionalText(formData.get("phone")),
      website: optionalText(formData.get("website")),
      instagram: optionalText(formData.get("instagram")),
      logo_url: logoUrl,
      serves_all_canada: servesAllCanada,
      description,
      status: "published",
      verified_at: new Date().toISOString(),
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/admin/registrations");
    revalidatePath("/");
    revalidatePath("/search");

    return {
      ok: true,
      message: "Business was published without an owner. Generate a claim link next.",
      createdBusiness: {
        id: businessId,
        city,
        name: businessName,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to create business.",
    };
  }
}

export async function createClaimInvite(
  _previousState: AdminBusinessActionState,
  formData: FormData,
): Promise<AdminBusinessActionState> {
  try {
    const user = await requireAdmin();
    const businessId = String(formData.get("businessId") ?? "").trim();
    const ownerEmail = optionalText(formData.get("ownerEmail"))?.toLowerCase() ?? null;

    if (!businessId) {
      return {
        ok: false,
        message: "Choose an unowned business.",
      };
    }

    const supabase = await createClient();
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, owner_id, name")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      return {
        ok: false,
        message: businessError?.message ?? "Business not found.",
      };
    }

    if (business.owner_id) {
      return {
        ok: false,
        message: "This business already has an owner.",
      };
    }

    const origin = await getRequestOrigin();
    const { data: activeInvites, error: activeInviteError } = await supabase
      .from("business_claim_invites")
      .select("token, invited_email, expires_at")
      .eq("business_id", business.id)
      .is("used_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .not("token", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (activeInviteError) {
      return {
        ok: false,
        message: activeInviteError.message,
      };
    }

    const reusableInvite = activeInvites?.find((invite) => {
      if (!invite.token) {
        return false;
      }

      if (!ownerEmail || !invite.invited_email) {
        return true;
      }

      return invite.invited_email.toLowerCase() === ownerEmail;
    });

    if (reusableInvite?.token) {
      return {
        ok: true,
        businessId: business.id,
        message: `Active claim link found for ${business.name}.`,
        claimUrl: `${origin}/claim/${reusableInvite.token}`,
        ownerEmail: reusableInvite.invited_email ?? ownerEmail ?? undefined,
      };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("business_claim_invites").insert({
      business_id: business.id,
      token,
      token_hash: tokenHash,
      invited_email: ownerEmail,
      expires_at: expiresAt,
      created_by: user.id,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/admin/registrations");

    return {
      ok: true,
      businessId: business.id,
      message: `Claim link created for ${business.name}. It expires in 14 days.`,
      claimUrl: `${origin}/claim/${token}`,
      ownerEmail: ownerEmail ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to create claim link.",
    };
  }
}
