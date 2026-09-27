export const BUSINESS_KEYWORD_MIN_COUNT = 3;
export const BUSINESS_KEYWORD_MAX_COUNT = 10;

const BUSINESS_KEYWORD_MAX_LENGTH = 40;
const keywordSeparatorPattern = /[,;\n]+/;

export function parseBusinessKeywords(value: string | null | undefined) {
  const seenKeywords = new Set<string>();

  return String(value ?? "")
    .split(keywordSeparatorPattern)
    .map(normalizeBusinessKeyword)
    .filter((keyword) => {
      if (!keyword || seenKeywords.has(keyword)) {
        return false;
      }

      seenKeywords.add(keyword);
      return true;
    });
}

export function formatBusinessKeywords(value: string | string[]) {
  const keywords = Array.isArray(value) ? value : parseBusinessKeywords(value);

  return keywords.join(", ");
}

export function validateRequiredBusinessKeywords(value: string | null | undefined) {
  const keywords = parseBusinessKeywords(value);
  const normalizedValue = formatBusinessKeywords(keywords);

  if (
    keywords.length < BUSINESS_KEYWORD_MIN_COUNT ||
    keywords.length > BUSINESS_KEYWORD_MAX_COUNT
  ) {
    return {
      keywords,
      ok: false as const,
      value: normalizedValue,
    };
  }

  const hasLongKeyword = keywords.some(
    (keyword) => keyword.length > BUSINESS_KEYWORD_MAX_LENGTH,
  );

  if (hasLongKeyword) {
    return {
      keywords,
      ok: false as const,
      value: normalizedValue,
    };
  }

  return {
    keywords,
    ok: true as const,
    value: normalizedValue,
  };
}

function normalizeBusinessKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
