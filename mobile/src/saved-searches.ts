import { isSupabaseConfigured, supabase } from "./supabase";

export type SavedSearch = {
  id: string;
  query: string;
  city: string;
  categorySlug: string;
  localOnly: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
};

export type SavedSearchInput = {
  query?: string;
  city?: string;
  categorySlug?: string;
  localOnly?: boolean;
};

type SavedSearchRow = {
  id: string;
  query: string;
  city: string;
  category_slug: string;
  local_only: boolean;
  created_at: string;
  last_notified_at: string | null;
};

export async function fetchSavedSearches(userId: string) {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, query, city, category_slug, local_only, created_at, last_notified_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSavedSearchesSchemaError(error)) {
      return [];
    }

    throw error;
  }

  return ((data ?? []) as SavedSearchRow[]).map(mapSavedSearch);
}

export async function createSavedSearch(
  input: SavedSearchInput,
  userId: string,
) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const savedSearch = normalizeSavedSearchInput(input);

  if (!hasSavedSearchFilter(savedSearch)) {
    throw new Error("Додайте ключове слово, місто або категорію.");
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .upsert(
      {
        category_slug: savedSearch.categorySlug,
        city: savedSearch.city,
        local_only: savedSearch.localOnly,
        query: savedSearch.query,
        user_id: userId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "user_id,query,city,category_slug,local_only",
      },
    )
    .select("id, query, city, category_slug, local_only, created_at, last_notified_at")
    .maybeSingle();

  if (error) {
    if (isMissingSavedSearchesSchemaError(error)) {
      throw new Error("Потрібно оновити базу даних для збережених пошуків.");
    }

    throw error;
  }

  return data ? mapSavedSearch(data as SavedSearchRow) : null;
}

export async function removeSavedSearch(savedSearchId: string, userId: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", savedSearchId)
    .eq("user_id", userId);

  if (error) {
    if (isMissingSavedSearchesSchemaError(error)) {
      throw new Error("Потрібно оновити базу даних для збережених пошуків.");
    }

    throw error;
  }
}

export function getSavedSearchKey(input: SavedSearchInput) {
  const savedSearch = normalizeSavedSearchInput(input);

  return [
    savedSearch.query.toLocaleLowerCase(),
    savedSearch.city.toLocaleLowerCase(),
    savedSearch.categorySlug.toLocaleLowerCase(),
    savedSearch.localOnly ? "local" : "all",
  ].join("|");
}

function mapSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    categorySlug: row.category_slug,
    city: row.city,
    createdAt: row.created_at,
    id: row.id,
    lastNotifiedAt: row.last_notified_at ?? undefined,
    localOnly: row.local_only,
    query: row.query,
  };
}

function normalizeSavedSearchInput(input: SavedSearchInput) {
  return {
    categorySlug: input.categorySlug?.trim() ?? "",
    city: input.city?.trim() ?? "",
    localOnly: Boolean(input.localOnly),
    query: input.query?.trim().replace(/\s+/g, " ") ?? "",
  };
}

function hasSavedSearchFilter(input: ReturnType<typeof normalizeSavedSearchInput>) {
  return Boolean(input.query || input.city || input.categorySlug);
}

function isMissingSavedSearchesSchemaError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("saved_searches") ||
    message.includes("schema cache")
  );
}
