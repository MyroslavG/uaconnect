"use server";

import { revalidatePath } from "next/cache";

import { categories } from "@/lib/data";
import { validateRequiredBusinessKeywords } from "@/lib/business-keywords";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type KeywordCompletionActionState = {
  message: string;
  ok: boolean;
};

export type SearchQueryRuleActionState = KeywordCompletionActionState;

const searchQueryRuleInitialError = {
  message: "Не вдалося зберегти правило пошуку.",
  ok: false,
} satisfies SearchQueryRuleActionState;
const categorySlugs = new Set(categories.map((category) => category.slug));

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

export async function createSearchQueryRule(
  _previousState: SearchQueryRuleActionState,
  formData: FormData,
): Promise<SearchQueryRuleActionState> {
  const access = await requireSearchRuleAdmin();
  if (!access.ok) {
    return access.state;
  }

  const values = validateSearchQueryRule(formData);
  if (!values.ok) {
    return values.state;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("search_query_rules").insert({
    aliases: values.aliases,
    created_by: access.user.id,
    inferred_category_slugs: values.categorySlugs,
    is_enabled: values.isEnabled,
    note: values.note,
    query: values.query,
  });

  if (error) {
    return toSearchRuleDatabaseError(error.message, error.code);
  }

  revalidateSearchRulePaths();
  return { ok: true, message: "Правило пошуку додано." };
}

export async function updateSearchQueryRule(
  _previousState: SearchQueryRuleActionState,
  formData: FormData,
): Promise<SearchQueryRuleActionState> {
  const access = await requireSearchRuleAdmin();
  if (!access.ok) {
    return access.state;
  }

  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const values = validateSearchQueryRule(formData);
  if (!ruleId) {
    return { ok: false, message: "Не вдалося знайти правило пошуку." };
  }
  if (!values.ok) {
    return values.state;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("search_query_rules")
    .update({
      aliases: values.aliases,
      inferred_category_slugs: values.categorySlugs,
      is_enabled: values.isEnabled,
      note: values.note,
      query: values.query,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId);

  if (error) {
    return toSearchRuleDatabaseError(error.message, error.code);
  }

  revalidateSearchRulePaths();
  return { ok: true, message: "Правило пошуку збережено." };
}

export async function deleteSearchQueryRule(formData: FormData) {
  const access = await requireSearchRuleAdmin();
  if (!access.ok) {
    return;
  }

  const ruleId = String(formData.get("ruleId") ?? "").trim();
  if (!ruleId) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("search_query_rules")
    .delete()
    .eq("id", ruleId);

  if (error) {
    console.error("[kolo:delete-search-query-rule]", error);
    return;
  }

  revalidateSearchRulePaths();
}

async function requireSearchRuleAdmin(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; state: SearchQueryRuleActionState }
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      state: { ok: false, message: "Supabase ще не налаштовано." },
    };
  }

  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user || !isAdmin) {
    return {
      ok: false,
      state: {
        ok: false,
        message: "Лише адміністратор може змінювати правила пошуку.",
      },
    };
  }

  return { ok: true, user };
}

function validateSearchQueryRule(formData: FormData):
  | {
      ok: true;
      aliases: string[];
      categorySlugs: string[];
      isEnabled: boolean;
      note: string | null;
      query: string;
    }
  | { ok: false; state: SearchQueryRuleActionState } {
  const query = normalizeRuleValue(formData.get("query"));
  const aliases = parseRuleList(formData.get("aliases"));
  const note = normalizeRuleValue(formData.get("note"));
  const selectedCategorySlugs = Array.from(
    new Set(
      formData
        .getAll("categorySlugs")
        .map((value) => String(value).trim())
        .filter((slug) => categorySlugs.has(slug)),
    ),
  );

  if (!query) {
    return { ok: false, state: { ok: false, message: "Вкажіть запит або фразу." } };
  }
  if (query.length > 120) {
    return {
      ok: false,
      state: { ok: false, message: "Запит має містити до 120 символів." },
    };
  }
  if (aliases.length > 20 || aliases.some((alias) => alias.length > 80)) {
    return {
      ok: false,
      state: {
        ok: false,
        message: "Додайте до 20 синонімів, до 80 символів кожен.",
      },
    };
  }
  if (note && note.length > 300) {
    return {
      ok: false,
      state: { ok: false, message: "Нотатка має містити до 300 символів." },
    };
  }

  return {
    ok: true,
    aliases: aliases.filter((alias) => normalizeRuleValue(alias) !== query),
    categorySlugs: selectedCategorySlugs,
    isEnabled: formData.get("isEnabled") === "on",
    note: note || null,
    query,
  };
}

function parseRuleList(value: FormDataEntryValue | null) {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(/[\n,;]/)
        .map(normalizeRuleValue)
        .filter(Boolean),
    ),
  );
}

function normalizeRuleValue(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function toSearchRuleDatabaseError(message: string, code?: string) {
  if (code === "23505") {
    return {
      ok: false,
      message: "Правило для такого запиту вже існує.",
    };
  }

  return { ...searchQueryRuleInitialError, message };
}

function revalidateSearchRulePaths() {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin/search-quality");
}
