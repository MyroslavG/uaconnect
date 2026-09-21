export const ANALYTICS_ALL_CATEGORY = "all";
export const ANALYTICS_ALL_LOCATION = "all-canada";

const categoryAliases: Record<string, string> = {
  "all-categories": ANALYTICS_ALL_CATEGORY,
  "all-category": ANALYTICS_ALL_CATEGORY,
  "advertising": "advertising-services",
  "advertising-service": "advertising-services",
  "auto": "auto-repair",
  "bookkeeper": "bookkeepers",
  "event": "events",
  "food": "grocery-stores",
  "grocery": "grocery-stores",
  "grocery-store": "grocery-stores",
  "insurance": "insurance-brokers",
  "insurance-broker": "insurance-brokers",
  "it": "it-services",
  "lawyer": "lawyers",
  "legal": "lawyers",
  "mortgage": "mortgage-brokers",
  "mortgage-broker": "mortgage-brokers",
  "morgage-broker": "mortgage-brokers",
  "morgage-brokers": "mortgage-brokers",
  "other": "other",
  "others": "other",
  "photo-video": "photographers",
  "photographer": "photographers",
  "realtor": "realtors",
  "repair": "repair-services",
  "repair-service": "repair-services",
  "shop": "shops",
  "textiles-decor": "textile-decor",
  "travel": "travel-tours",
  "travel-tour": "travel-tours",
  "wellness": "wellness-care",
};

const allLocationAliases = [
  "all",
  "all canada",
  "all cities",
  "canada",
  "canada wide",
  "online canada wide",
  "по всій канаді",
  "уся канада",
  "усі міста",
  "вся канада",
];

const cityAliasRules = [
  {
    aliases: [
      "ottawa",
      "ottawa on",
      "kanata",
      "kanata west",
      "kanata west ottawa",
      "stittsville",
      "nepean",
      "orleans",
      "barrhaven",
      "vanier",
      "оттава",
      "отава",
    ],
    slug: "ottawa",
  },
  {
    aliases: [
      "gatineau",
      "gatineau qc",
      "гатіно",
      "гатино",
    ],
    slug: "gatineau",
  },
  {
    aliases: [
      "toronto",
      "toronto on",
      "gta",
      "greater toronto area",
      "mississauga",
      "north york",
      "scarborough",
      "etobicoke",
      "торонто",
    ],
    slug: "toronto",
  },
  {
    aliases: [
      "montreal",
      "montreal qc",
      "montréal",
      "монреаль",
      "монтреаль",
    ],
    slug: "montreal",
  },
  {
    aliases: [
      "vancouver",
      "vancouver bc",
      "burnaby",
      "richmond",
      "surrey",
      "ванкувер",
    ],
    slug: "vancouver",
  },
  {
    aliases: ["calgary", "calgary ab", "калгарі", "калгари"],
    slug: "calgary",
  },
  {
    aliases: ["edmonton", "edmonton ab", "едмонтон"],
    slug: "edmonton",
  },
  {
    aliases: ["winnipeg", "winnipeg mb", "вінніпег", "виннипег"],
    slug: "winnipeg",
  },
  {
    aliases: ["saskatoon", "saskatoon sk", "саскатун"],
    slug: "saskatoon",
  },
  {
    aliases: ["halifax", "halifax ns", "галіфакс", "халіфакс"],
    slug: "halifax",
  },
  {
    aliases: [
      "st johns",
      "st johns nl",
      "saint johns",
      "st john's",
      "st john's newfoundland and labrador",
      "st johns newfoundland and labrador",
      "ньюфаундленд",
    ],
    slug: "st-johns",
  },
  {
    aliases: [
      "quebec city",
      "quebec city qc",
      "québec city",
      "квебек",
    ],
    slug: "quebec-city",
  },
] as const;

const normalizedCityAliasRules = cityAliasRules.map((rule) => ({
  ...rule,
  aliases: rule.aliases.map(normalizeText),
}));

export function normalizeAnalyticsCategorySlug(
  value: string | null | undefined,
  fallback: string | null = null,
) {
  const slug = slugify(value);

  if (!slug) {
    return fallback;
  }

  return categoryAliases[slug] ?? slug;
}

export function normalizeAnalyticsCity(
  value: string | null | undefined,
  fallback: string | null = null,
) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return fallback;
  }

  if (allLocationAliases.map(normalizeText).includes(normalized)) {
    return ANALYTICS_ALL_LOCATION;
  }

  for (const rule of normalizedCityAliasRules) {
    if (
      rule.aliases.some(
        (alias) =>
          normalized === alias ||
          normalized.includes(alias) ||
          alias.includes(normalized),
      )
    ) {
      return rule.slug;
    }
  }

  const primaryLocation = normalized.split(",")[0]?.trim() || normalized;

  return slugify(primaryLocation) || fallback;
}

function slugify(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[-.&/]+/g, " ")
    .replace(/\b(ontario|quebec|alberta|british columbia|manitoba|saskatchewan|nova scotia|newfoundland and labrador)\b/g, " ")
    .replace(/\b(on|qc|ab|bc|mb|sk|ns|nl)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
