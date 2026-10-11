import { isSupabaseConfigured, supabase } from "./supabase";

const categorySearchAliases: Record<string, string> = {
  "advertising-services": "advertising marketing design print branding social media реклама маркетинг дизайн друк брендинг соцмережі",
  "auto-repair": "auto car repair detailing mechanic авто автосервіс ремонт детайлінг механік",
  beauty: "beauty hair nails manicure pedicure makeup brows salon краса волосся нігті манікюр педикюр макіяж брови салон ногти маникюр педикюр",
  bookkeepers: "bookkeeper bookkeeping accountant accounting payroll invoices reporting tax finance бухгалтер бухгалтерія облік зарплата рахунки звітність фінанси",
  cleaning: "cleaning cleaner housekeeping move out прибирання клінінг чистка",
  construction: "construction renovation contractor repair building будівництво ремонт майстер",
  events: "events party wedding decor planning івенти події весілля декор свято",
  flowers: "flowers florist bouquets квіти флорист букети",
  "grocery-stores": "food grocery bakery catering products cake sweets їжа продукти пекарня кейтеринг торт торти десерти",
  "insurance-brokers": "insurance broker страхування страховий брокер",
  "it-services": "it tech software websites automation ai support technology repair phone iphone сайти техпідтримка автоматизація ремонт телефон айфон",
  lawyers: "law lawyer legal attorney immigration юрист юридичні правова імміграція",
  "mortgage-brokers": "mortgage broker financing refinance renewal pre approval home loan іпотека іпотечний брокер кредит фінансування рефінансування житло",
  moving: "moving movers relocation packing delivery furniture transport переїзд перевезення доставка пакування меблі",
  photographers: "photo video photography photographer фото відео фотограф зйомка",
  realtors: "realtor real estate home mortgage рієлтор нерухомість житло",
  "repair-services": "repair handyman appliance furniture service phone iphone ремонт майстер техніка меблі телефон айфон",
  restaurants: "food restaurant cafe bakery catering kitchen cake sweets їжа ресторан кафе пекарня кейтеринг кухня торт десерти",
  shops: "shop store retail boutique магазин крамниця товари",
  "textile-decor": "textile decor pillows curtains upholstery home текстиль декор подушки штори перетяжка",
  "travel-tours": "travel tours trips tickets vacation подорожі тури квитки відпочинок",
  tutors: "tutor lessons teacher education репетитор уроки навчання викладач",
  "wellness-care": "wellness yoga trainer meditation mental health self care massage здоров'я йога тренер медитація психолог масаж",
};

const queryAliasGroups = [
  ["нігті", "ногти", "nails", "nail", "манікюр", "маникюр", "manicure"],
  ["брови", "brows", "eyebrows"],
  ["макіяж", "макияж", "makeup", "mua"],
  ["іпотека", "ипотека", "mortgage", "home loan", "pre approval"],
  ["бухгалтер", "bookkeeper", "bookkeeping", "accountant", "accounting"],
  ["переїзд", "переезд", "moving", "movers", "relocation"],
  ["торт", "торти", "cake", "cakes", "dessert", "десерт"],
  ["фото", "photographer", "photography", "фотограф"],
  ["ремонт телефону", "phone repair", "iphone repair", "айфон", "телефон"],
  ["сайт", "website", "web design", "розробка сайту", "вебсайт"],
  ["страхування", "insurance", "broker"],
  ["юрист", "lawyer", "legal", "immigration"],
  ["репетитор", "tutor", "lessons", "teacher"],
  ["клінінг", "cleaning", "cleaner", "прибирання"],
  ["масаж", "massage", "wellness"],
];

export type SearchIntent = {
  expandedTerms: string[];
  inferredCategorySlugs: string[];
  normalizedQuery: string;
};

type SearchQueryRule = {
  aliases: string[];
  inferredCategorySlugs: string[];
  query: string;
};

let cachedSearchQueryRules: { expiresAt: number; rules: SearchQueryRule[] } | null = null;
const SEARCH_QUERY_RULES_CACHE_MS = 15 * 60 * 1000;

export function getCategorySearchAliases(categorySlug: string) {
  return categorySearchAliases[categorySlug] ?? "";
}

export function getSearchIntent(query: string | undefined): SearchIntent {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return { expandedTerms: [], inferredCategorySlugs: [], normalizedQuery };
  }

  const terms = new Set([normalizedQuery]);

  for (const group of queryAliasGroups) {
    const normalizedGroup = group.map(normalizeSearchText).filter(Boolean);
    const isMatch = normalizedGroup.some(
      (alias) =>
        alias === normalizedQuery ||
        alias.includes(normalizedQuery) ||
        normalizedQuery.includes(alias),
    );

    if (isMatch) {
      normalizedGroup.forEach((alias) => terms.add(alias));
    }
  }

  const expandedTerms = Array.from(terms);
  const inferredCategorySlugs = Object.entries(categorySearchAliases)
    .filter(([, aliases]) =>
      expandedTerms.some((term) => normalizeSearchText(aliases).includes(term)),
    )
    .map(([categorySlug]) => categorySlug);

  return { expandedTerms, inferredCategorySlugs, normalizedQuery };
}

export async function getSearchIntentWithQueryRules(
  query: string | undefined,
): Promise<SearchIntent> {
  const staticIntent = getSearchIntent(query);

  if (!staticIntent.normalizedQuery || !isSupabaseConfigured) {
    return staticIntent;
  }

  const rules = await getActiveSearchQueryRules();
  return mergeSearchIntentWithRules(staticIntent, rules);
}

export function getExpandedSearchTerms(query: string | undefined) {
  return getSearchIntent(query).expandedTerms;
}

export function normalizeSearchText(value: string | undefined | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}

async function getActiveSearchQueryRules(): Promise<SearchQueryRule[]> {
  if (cachedSearchQueryRules && cachedSearchQueryRules.expiresAt > Date.now()) {
    return cachedSearchQueryRules.rules;
  }

  const { data, error } = await supabase
    .from("search_query_rules")
    .select("query, aliases, inferred_category_slugs")
    .eq("is_enabled", true)
    .limit(250);

  if (error) {
    console.warn("[kolo:mobile-search-query-rules]", error);
    return [];
  }

  const rules = (data ?? []).map((rule) => ({
    aliases: Array.isArray(rule.aliases) ? rule.aliases : [],
    inferredCategorySlugs: Array.isArray(rule.inferred_category_slugs)
      ? rule.inferred_category_slugs
      : [],
    query: rule.query,
  }));

  cachedSearchQueryRules = {
    expiresAt: Date.now() + SEARCH_QUERY_RULES_CACHE_MS,
    rules,
  };

  return rules;
}

function mergeSearchIntentWithRules(
  intent: SearchIntent,
  rules: SearchQueryRule[],
): SearchIntent {
  if (!intent.normalizedQuery || !rules.length) {
    return intent;
  }

  const expandedTerms = new Set(intent.expandedTerms);
  const inferredCategorySlugs = new Set(intent.inferredCategorySlugs);

  for (const rule of rules) {
    const ruleTerms = [rule.query, ...rule.aliases]
      .map(normalizeSearchText)
      .filter(Boolean);

    if (!ruleTerms.some((term) => isRuleMatch(intent.normalizedQuery, term))) {
      continue;
    }

    ruleTerms.forEach((term) => expandedTerms.add(term));
    rule.inferredCategorySlugs
      .map((slug) => slug.trim())
      .filter(Boolean)
      .forEach((slug) => inferredCategorySlugs.add(slug));
  }

  return {
    expandedTerms: Array.from(expandedTerms),
    inferredCategorySlugs: Array.from(inferredCategorySlugs),
    normalizedQuery: intent.normalizedQuery,
  };
}

function isRuleMatch(query: string, ruleTerm: string) {
  return (
    query === ruleTerm ||
    (ruleTerm.length >= 3 && query.includes(ruleTerm)) ||
    (query.length >= 3 && ruleTerm.includes(query))
  );
}
