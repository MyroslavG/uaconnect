"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  Database,
  OutreachProspectPriority,
  OutreachProspectStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AdminProspectActionState = {
  ok: boolean;
  message: string;
};

type OutreachProspectInsert =
  Database["public"]["Tables"]["outreach_prospects"]["Insert"];
type OutreachProspectUpdate =
  Database["public"]["Tables"]["outreach_prospects"]["Update"];

const prospectStatuses: OutreachProspectStatus[] = [
  "new",
  "contacted",
  "interested",
  "added",
  "rejected",
];

const prospectPriorities: OutreachProspectPriority[] = [
  "low",
  "medium",
  "high",
];

export async function createOutreachProspect(
  _previousState: AdminProspectActionState,
  formData: FormData,
): Promise<AdminProspectActionState> {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.state;
  }

  const businessName = requiredText(formData.get("businessName"));
  const city = requiredText(formData.get("city"));
  const categorySlug = requiredText(formData.get("categorySlug"));

  if (!businessName || !city || !categorySlug) {
    return {
      ok: false,
      message: "Add business name, city, and category.",
    };
  }

  const insert: OutreachProspectInsert = {
    business_name: businessName,
    category_slug: categorySlug,
    city,
    contact_name: optionalText(formData.get("contactName")),
    created_by: adminCheck.userId,
    email: optionalText(formData.get("email")),
    instagram: normalizeInstagram(formData.get("instagram")),
    next_follow_up_at: normalizeDate(formData.get("nextFollowUpAt")),
    next_step: optionalText(formData.get("nextStep")),
    notes: optionalText(formData.get("notes")),
    phone: optionalText(formData.get("phone")),
    priority: normalizePriority(formData.get("priority")) ?? "medium",
    source: optionalText(formData.get("source")),
    status: normalizeStatus(formData.get("status")) ?? "new",
    website: normalizeWebsite(formData.get("website")),
  };

  const { error } = await adminCheck.supabase
    .from("outreach_prospects")
    .insert(insert);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateProspects();

  return {
    ok: true,
    message: "Prospect saved.",
  };
}

export async function updateOutreachProspect(formData: FormData) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return;
  }

  const prospectId = requiredText(formData.get("prospectId"));

  if (!prospectId) {
    return;
  }

  const update: OutreachProspectUpdate = {
    next_follow_up_at: normalizeDate(formData.get("nextFollowUpAt")),
    next_step: optionalText(formData.get("nextStep")),
    notes: optionalText(formData.get("notes")),
    priority: normalizePriority(formData.get("priority")) ?? "medium",
    status: normalizeStatus(formData.get("status")) ?? "new",
  };

  const { error } = await adminCheck.supabase
    .from("outreach_prospects")
    .update(update)
    .eq("id", prospectId);

  if (error) {
    console.error("[kolo:admin-prospects] Update prospect failed", {
      code: error.code,
      details: error.details,
      message: error.message,
    });
  }

  revalidateProspects();
}

export async function deleteOutreachProspect(formData: FormData) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return;
  }

  const prospectId = requiredText(formData.get("prospectId"));

  if (!prospectId) {
    return;
  }

  const { error } = await adminCheck.supabase
    .from("outreach_prospects")
    .delete()
    .eq("id", prospectId);

  if (error) {
    console.error("[kolo:admin-prospects] Delete prospect failed", {
      code: error.code,
      details: error.details,
      message: error.message,
    });
  }

  revalidateProspects();
}

async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      state: {
        ok: false,
        message: "Supabase is not configured yet.",
      },
    };
  }

  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user || !isAdmin) {
    return {
      ok: false as const,
      state: {
        ok: false,
        message: "Only admins can manage outreach prospects.",
      },
    };
  }

  const supabase = await createClient();

  return {
    ok: true as const,
    supabase,
    userId: user.id,
  };
}

function revalidateProspects() {
  revalidatePath("/admin/prospects");
  revalidatePath("/admin/coverage");
}

function normalizeStatus(
  value: FormDataEntryValue | null,
): OutreachProspectStatus | null {
  return prospectStatuses.includes(value as OutreachProspectStatus)
    ? (value as OutreachProspectStatus)
    : null;
}

function normalizePriority(
  value: FormDataEntryValue | null,
): OutreachProspectPriority | null {
  return prospectPriorities.includes(value as OutreachProspectPriority)
    ? (value as OutreachProspectPriority)
    : null;
}

function normalizeDate(value: FormDataEntryValue | null) {
  const date = optionalText(value);

  return date || null;
}

function normalizeInstagram(value: FormDataEntryValue | null) {
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  return text.startsWith("@") ? text.slice(1) : text;
}

function normalizeWebsite(value: FormDataEntryValue | null) {
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function requiredText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

function optionalText(value: FormDataEntryValue | null) {
  return requiredText(value);
}
