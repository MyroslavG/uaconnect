import type { Business, BusinessContentItem } from "@/lib/types";

type RankBusinessesOptions = {
  categorySlug?: string;
  citySlug?: string;
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
    getLocationScore(business, options.citySlug) +
    getCategoryScore(business, options.categorySlug) +
    getProfileCompletenessScore(business) +
    getActivityScore(business, now) +
    getNewBusinessScore(business, now)
  );
}

function getSearchScore(business: Business, query?: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return 0;
  }

  const fields = [
    { value: business.name, weight: 70 },
    { value: business.category, weight: 38 },
    { value: business.categorySlug, weight: 28 },
    { value: business.city, weight: 24 },
    { value: business.neighborhood, weight: 18 },
    { value: business.address, weight: 14 },
    { value: business.description, weight: 22 },
    { value: business.tags.join(" "), weight: 18 },
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

    if (value === normalizedQuery) {
      return total + field.weight;
    }

    if (value.startsWith(normalizedQuery)) {
      return total + field.weight * 0.75;
    }

    if (value.includes(normalizedQuery)) {
      return total + field.weight * 0.45;
    }

    return total;
  }, 0);

  return Math.min(score, 140);
}

function getLocationScore(business: Business, citySlug?: string) {
  const distanceScore =
    typeof business.distanceInKm === "number"
      ? Math.max(0, 42 - business.distanceInKm * 0.5)
      : 0;
  const exactCityScore =
    citySlug && business.citySlug === citySlug
      ? 30
      : citySlug && business.servesAllCanada
        ? 10
        : 0;

  return distanceScore + exactCityScore;
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
    Number(Boolean(business.verifiedAt)) * 8 +
    contactScore
  );
}

function getActivityScore(business: Business, now: number) {
  const signals = getActivitySignals(business, now);
  const contentScore =
    Math.min(signals.serviceCount, 3) * 7 +
    Math.min(signals.eventCount, 3) * 6 +
    Math.min(signals.productCount, 3) * 5 +
    Math.min(signals.upcomingEventCount, 2) * 10;
  const latestActivityScore = getRecencyScore(signals.latestActivityAt, now, {
    fourteenDays: 18,
    month: 13,
    quarter: 8,
    halfYear: 4,
  });

  return Math.min(contentScore, 42) + latestActivityScore;
}

function getNewBusinessScore(business: Business, now: number) {
  return getRecencyScore(business.createdAt, now, {
    fourteenDays: 6,
    month: 3,
    quarter: 0,
    halfYear: 0,
  });
}

function getActivitySignals(business: Business, now: number) {
  const contentItems = business.contentItems ?? [];
  const latestContentItemAt = getLatestContentItemAt(contentItems);

  return {
    contentCount:
      business.rankingSignals?.contentCount ?? contentItems.length,
    eventCount:
      business.rankingSignals?.eventCount ??
      contentItems.filter((item) => item.type === "event").length,
    latestActivityAt:
      getLatestDate([
        business.updatedAt,
        business.rankingSignals?.latestContentAt,
        latestContentItemAt,
      ]) ?? business.updatedAt,
    serviceCount:
      business.rankingSignals?.serviceCount ??
      contentItems.filter((item) => item.type === "service").length,
    productCount:
      business.rankingSignals?.productCount ??
      contentItems.filter((item) => item.type === "product").length,
    upcomingEventCount:
      business.rankingSignals?.upcomingEventCount ??
      contentItems.filter((item) => isUpcomingEvent(item, now)).length,
  };
}

function getLatestContentItemAt(contentItems: BusinessContentItem[]) {
  return getLatestDate(
    contentItems.flatMap((item) => [item.updatedAt, item.createdAt]),
  );
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
  return value?.trim().toLowerCase() ?? "";
}
