import type { Business, BusinessContentItem } from "./types";
import { getPublicBusinessContentItems } from "./contentVisibility";

type RankBusinessesOptions = {
  categorySlug?: string;
  location?: string;
  query?: string;
};

export function rankBusinesses(
  businesses: Business[],
  options: RankBusinessesOptions = {},
) {
  const now = Date.now();

  return businesses
    .map((business, index) => ({
      business,
      index,
      score: getBusinessRankScore(business, options, now),
      updatedAt: getTimestamp(business.updatedAt),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (second.updatedAt !== first.updatedAt) {
        return second.updatedAt - first.updatedAt;
      }

      return first.index - second.index;
    })
    .map(({ business }) => business);
}

function getBusinessRankScore(
  business: Business,
  options: RankBusinessesOptions,
  now: number,
) {
  return (
    getSearchScore(business, options.query) +
    getLocationScore(business, options.location) +
    getCategoryScore(business, options.categorySlug) +
    getProfileCompletenessScore(business) +
    getActivityScore(business, now) +
    getNewBusinessScore(business, now)
  );
}

function getSearchScore(business: Business, query?: string) {
  const searchTerms = getExpandedSearchTerms(query);

  if (searchTerms.length === 0) {
    return 0;
  }

  const fields = [
    { value: business.name, weight: 70 },
    { value: business.categorySlug, weight: 34 },
    { value: getCategorySearchAliases(business.categorySlug), weight: 32 },
    { value: business.city, weight: 24 },
    { value: business.address, weight: 14 },
    { value: business.keywords, weight: 88 },
    { value: business.description, weight: 22 },
    {
      value: (business.contentItems ?? [])
        .map((item) => `${item.title} ${item.description} ${item.location ?? ""}`)
        .join(" "),
      weight: 24,
    },
  ];

  const score = fields.reduce((total, field) => {
    const value = normalize(field.value);

    if (!value) {
      return total;
    }

    const bestTermScore = Math.max(
      0,
      ...searchTerms.map((term, index) => {
        const aliasMultiplier = index === 0 ? 1 : 0.72;

        if (value === term) {
          return field.weight * aliasMultiplier;
        }

        if (value.startsWith(term)) {
          return field.weight * 0.75 * aliasMultiplier;
        }

        if (value.includes(term)) {
          return field.weight * 0.45 * aliasMultiplier;
        }

        return 0;
      }),
    );

    return total + bestTermScore;
  }, 0);

  return Math.min(score, 140);
}

function getLocationScore(business: Business, location?: string) {
  const normalizedLocation = normalize(location);

  if (!normalizedLocation) {
    return 0;
  }

  const normalizedCity = normalize(business.city);
  const normalizedAddress = normalize(business.address);

  if (normalizedCity === normalizedLocation) {
    return 30;
  }

  if (
    normalizedCity.includes(normalizedLocation) ||
    normalizedLocation.includes(normalizedCity) ||
    normalizedAddress.includes(normalizedLocation)
  ) {
    return 20;
  }

  return business.servesAllCanada ? 8 : 0;
}

function getCategoryScore(business: Business, categorySlug?: string) {
  return categorySlug && business.categorySlug === categorySlug ? 32 : 0;
}

function getProfileCompletenessScore(business: Business) {
  const descriptionLength = business.description.trim().length;
  const contactScore =
    Number(Boolean(business.phone)) * 6 +
    Number(Boolean(business.website)) * 6 +
    Number(Boolean(business.instagram)) * 5;

  return (
    Number(Boolean(business.logoUrl)) * 12 +
    Number(descriptionLength >= 80) * 9 +
    Number(descriptionLength >= 160) * 4 +
    Number(Boolean(business.address || business.servesAllCanada)) * 7 +
    Number(Boolean(business.ownerName?.trim())) * 3 +
    contactScore
  );
}

function getActivityScore(business: Business, now: number) {
  const contentItems = getPublicBusinessContentItems(
    business.contentItems,
    now,
  );
  const serviceCount = contentItems.filter((item) => item.type === "service").length;
  const eventCount = contentItems.filter((item) => item.type === "event").length;
  const productCount = contentItems.filter((item) => item.type === "product").length;
  const upcomingEventCount = contentItems.filter((item) =>
    isUpcomingEvent(item, now),
  ).length;
  const contentScore =
    Math.min(serviceCount, 3) * 7 +
    Math.min(eventCount, 3) * 6 +
    Math.min(productCount, 3) * 5 +
    Math.min(upcomingEventCount, 2) * 10;
  const latestActivityAt =
    getLatestDate([
      business.updatedAt,
      ...contentItems.flatMap((item) => [item.updatedAt, item.createdAt]),
    ]) ?? business.updatedAt;

  return (
    Math.min(contentScore, 42) +
    getRecencyScore(latestActivityAt, now, {
      fourteenDays: 18,
      month: 13,
      quarter: 8,
      halfYear: 4,
    })
  );
}

function getNewBusinessScore(business: Business, now: number) {
  return getRecencyScore(business.createdAt, now, {
    fourteenDays: 6,
    month: 3,
    quarter: 0,
    halfYear: 0,
  });
}

function isUpcomingEvent(item: BusinessContentItem, now: number) {
  return item.type === "event" && getTimestamp(item.startsAt) >= now;
}

function getRecencyScore(
  value: string | undefined,
  now: number,
  scores: {
    fourteenDays: number;
    month: number;
    quarter: number;
    halfYear: number;
  },
) {
  const timestamp = getTimestamp(value);

  if (!timestamp) {
    return 0;
  }

  const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 14) {
    return scores.fourteenDays;
  }

  if (ageInDays <= 30) {
    return scores.month;
  }

  if (ageInDays <= 90) {
    return scores.quarter;
  }

  if (ageInDays <= 180) {
    return scores.halfYear;
  }

  return 0;
}

function getLatestDate(values: Array<string | undefined>) {
  const latestTimestamp = Math.max(0, ...values.map(getTimestamp));

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : undefined;
}

function getTimestamp(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalize(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function getCategorySearchAliases(categorySlug: string) {
  const aliases: Record<string, string> = {
    "advertising-services":
      "advertising marketing design print branding social media реклама маркетинг дизайн друк брендинг соцмережі",
    "auto-repair":
      "auto car repair detailing mechanic авто автосервіс ремонт детайлінг механік",
    beauty:
      "beauty hair nails manicure pedicure makeup brows salon краса волосся нігті манікюр педикюр макіяж брови салон ногти маникюр педикюр",
    bookkeepers:
      "bookkeeper bookkeeping accountant accounting payroll invoices reporting tax finance бухгалтер бухгалтерія облік зарплата рахунки звітність фінанси",
    cleaning:
      "cleaning cleaner housekeeping move out прибирання клінінг чистка",
    construction:
      "construction renovation contractor repair building будівництво ремонт майстер",
    events:
      "events party wedding decor planning івенти події весілля декор свято",
    flowers:
      "flowers florist bouquets квіти флорист букети",
    "grocery-stores":
      "food grocery bakery catering products cake sweets їжа продукти пекарня кейтеринг торт торти десерти",
    "insurance-brokers":
      "insurance broker страхування страховий брокер",
    "it-services":
      "it tech software websites automation ai support technology repair phone iphone сайти техпідтримка автоматизація ремонт телефон айфон",
    lawyers:
      "law lawyer legal attorney immigration юрист юридичні правова імміграція",
    "mortgage-brokers":
      "mortgage broker financing refinance renewal pre approval home loan іпотека іпотечний брокер кредит фінансування рефінансування житло",
    moving:
      "moving movers relocation packing delivery furniture transport переїзд перевезення доставка пакування меблі",
    photographers:
      "photo video photography photographer фотo фото відео фотограф зйомка",
    realtors:
      "realtor real estate home mortgage рієлтор нерухомість житло",
    "repair-services":
      "repair handyman appliance furniture service phone iphone ремонт майстер техніка меблі телефон айфон",
    restaurants:
      "food restaurant cafe bakery catering kitchen cake sweets їжа ресторан кафе пекарня кейтеринг кухня торт десерти",
    shops:
      "shop store retail boutique магазин крамниця товари",
    "textile-decor":
      "textile decor pillows curtains upholstery home текстиль декор подушки штори перетяжка",
    "travel-tours":
      "travel tours trips tickets vacation подорожі тури квитки відпочинок",
    tutors:
      "tutor lessons teacher education репетитор уроки навчання викладач",
    "wellness-care":
      "wellness yoga trainer meditation mental health self care massage здоров'я йога тренер медитація психолог масаж",
  };

  return aliases[categorySlug] ?? "";
}

function getExpandedSearchTerms(query: string | undefined) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  const aliasGroups = [
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
  const terms = new Set([normalizedQuery]);

  for (const group of aliasGroups) {
    const normalizedGroup = group.map(normalize).filter(Boolean);
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

  return Array.from(terms);
}
