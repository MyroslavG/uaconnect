"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ClaimActionState = {
  ok: boolean;
  message: string;
};

export async function claimBusinessInvite(
  _previousState: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Supabase is not configured yet.",
    };
  }

  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return {
      ok: false,
      message: "Claim token is missing.",
    };
  }

  const supabase = await createClient();
  const { data: registrationId, error } = await supabase.rpc(
    "claim_business_with_token",
    {
      invite_token: token,
    },
  );

  if (error || !registrationId) {
    return {
      ok: false,
      message: error?.message ?? "Unable to claim this business.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/registrations");
  revalidatePath("/");
  redirect(`/dashboard#business-${registrationId}`);
}
