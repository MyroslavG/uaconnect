"use server";

import { revalidatePath } from "next/cache";

import { validateRequiredBusinessKeywords } from "@/lib/business-keywords";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type KeywordCompletionActionState = {
  message: string;
  ok: boolean;
};

export async function updateBusinessSearchKeywords(
  _previousState: KeywordCompletionActionState,
  formData: FormData,
): Promise<KeywordCompletionActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase ще не налаштовано." };
  }

  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user || !isAdmin) {
    return { ok: false, message: "Лише адміністратор може редагувати ключові слова." };
  }

  const businessId = String(formData.get("businessId") ?? "").trim();
  const keywordsValidation = validateRequiredBusinessKeywords(
    String(formData.get("keywords") ?? ""),
  );

  if (!businessId) {
    return { ok: false, message: "Не вдалося знайти бізнес." };
  }

  if (!keywordsValidation.ok) {
    return {
      ok: false,
      message: "Додайте від 3 до 10 ключових слів, до 40 символів кожне.",
    };
  }

  const supabase = await createClient();
  const { data: business, error: businessReadError } = await supabase
    .from("businesses")
    .select("id, registration_id, slug")
    .eq("id", businessId)
    .maybeSingle();

  if (businessReadError || !business) {
    return {
      ok: false,
      message: businessReadError?.message ?? "Бізнес не знайдено.",
    };
  }

  const { error: businessUpdateError } = await supabase
    .from("businesses")
    .update({ keywords: keywordsValidation.value })
    .eq("id", business.id);

  if (businessUpdateError) {
    return { ok: false, message: businessUpdateError.message };
  }

  if (business.registration_id) {
    const { error: registrationUpdateError } = await supabase
      .from("business_registrations")
      .update({ keywords: keywordsValidation.value })
      .eq("id", business.registration_id);

    if (registrationUpdateError) {
      return {
        ok: false,
        message: `Ключові слова збережено у публічному профілі, але не вдалося синхронізувати заявку: ${registrationUpdateError.message}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/dashboard");
  revalidatePath("/admin/search-quality");
  revalidatePath("/admin/users");
  revalidatePath(`/business/${business.slug}`);

  return { ok: true, message: "Ключові слова збережено." };
}
