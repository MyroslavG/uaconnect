"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  Database,
  MediaCampaignType,
  MediaChannel,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AdminMediaActionState = {
  ok: boolean;
  message: string;
};

type MediaKpiSnapshotInsert =
  Database["public"]["Tables"]["media_kpi_snapshots"]["Insert"];

const campaignTypes: MediaCampaignType[] = [
  "announcement",
  "guest_call",
  "interview",
  "partnership",
  "social",
  "other",
];

const mediaChannels: MediaChannel[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "newsletter",
  "website",
  "offline",
  "other",
];

export async function createMediaKpiSnapshot(
  _previousState: AdminMediaActionState,
  formData: FormData,
): Promise<AdminMediaActionState> {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.state;
  }

  const campaignName = requiredText(formData.get("campaignName"));
  const campaignType = normalizeCampaignType(formData.get("campaignType"));
  const channel = normalizeChannel(formData.get("channel"));

  if (!campaignName || !campaignType || !channel) {
    return {
      ok: false,
      message: "Add campaign name, type, and channel.",
    };
  }

  const insert: MediaKpiSnapshotInsert = {
    business_leads: nonNegativeInteger(formData.get("businessLeads")),
    campaign_name: campaignName,
    campaign_type: campaignType,
    channel,
    clicks: nonNegativeInteger(formData.get("clicks")),
    created_by: adminCheck.userId,
    followers: nonNegativeInteger(formData.get("followers")),
    notes: optionalText(formData.get("notes")),
    registrations: nonNegativeInteger(formData.get("registrations")),
    snapshot_date: normalizeDate(formData.get("snapshotDate")),
    url: optionalText(formData.get("url")),
    views: nonNegativeInteger(formData.get("views")),
    watch_time_minutes: nonNegativeInteger(formData.get("watchTimeMinutes")),
  };

  const { error } = await adminCheck.supabase
    .from("media_kpi_snapshots")
    .insert(insert);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateMedia();

  return {
    ok: true,
    message: "KPI snapshot saved.",
  };
}

export async function deleteMediaKpiSnapshot(formData: FormData) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return;
  }

  const snapshotId = requiredText(formData.get("snapshotId"));

  if (!snapshotId) {
    return;
  }

  const { error } = await adminCheck.supabase
    .from("media_kpi_snapshots")
    .delete()
    .eq("id", snapshotId);

  if (error) {
    console.error("[kolo:admin-media] Delete KPI snapshot failed", {
      code: error.code,
      details: error.details,
      message: error.message,
    });
  }

  revalidateMedia();
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
        message: "Only admins can manage media KPIs.",
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

function revalidateMedia() {
  revalidatePath("/admin/media");
  revalidatePath("/admin/analytics");
}

function normalizeCampaignType(
  value: FormDataEntryValue | null,
): MediaCampaignType | null {
  return campaignTypes.includes(value as MediaCampaignType)
    ? (value as MediaCampaignType)
    : null;
}

function normalizeChannel(value: FormDataEntryValue | null): MediaChannel | null {
  return mediaChannels.includes(value as MediaChannel)
    ? (value as MediaChannel)
    : null;
}

function normalizeDate(value: FormDataEntryValue | null) {
  const date = requiredText(value);

  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }

  return date;
}

function nonNegativeInteger(value: FormDataEntryValue | null) {
  const parsedValue = Number.parseInt(String(value ?? "0"), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function requiredText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  return text.length > 0 ? text : null;
}

function optionalText(value: FormDataEntryValue | null) {
  return requiredText(value);
}
