import {
  getSearchIntent,
  mergeSearchIntentWithRules,
  type SearchIntent,
  type SearchQueryRule,
} from "@/lib/search-aliases";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MAX_ACTIVE_RULES = 250;

export async function getSearchIntentWithQueryRules(
  query: string | undefined,
): Promise<SearchIntent> {
  const staticIntent = getSearchIntent(query);

  if (!staticIntent.normalizedQuery || !isSupabaseConfigured()) {
    return staticIntent;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("search_query_rules")
    .select("query, aliases, inferred_category_slugs")
    .eq("is_enabled", true)
    .limit(MAX_ACTIVE_RULES);

  if (error) {
    console.error("[kolo:web-search-query-rules]", error);
    return staticIntent;
  }

  const rules: SearchQueryRule[] = (data ?? []).map((rule) => ({
    aliases: rule.aliases,
    inferredCategorySlugs: rule.inferred_category_slugs,
    query: rule.query,
  }));

  return mergeSearchIntentWithRules(staticIntent, rules);
}
