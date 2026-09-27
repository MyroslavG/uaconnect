export const BUSINESS_KEYWORD_MIN_COUNT = 3;
export const BUSINESS_KEYWORD_MAX_COUNT = 10;

const BUSINESS_KEYWORD_MAX_LENGTH = 40;
const keywordSeparatorPattern = /[,;\n]+/;

export type BusinessKeywordValidationResult =
  | {
      keywords: string[];
      ok: true;
      value: string;
    }
  | {
      keywords: string[];
      message: string;
      ok: false;
      value: string;
    };

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

export function validateRequiredBusinessKeywords(
  value: string | null | undefined,
): BusinessKeywordValidationResult {
  const keywords = parseBusinessKeywords(value);
  const normalizedValue = formatBusinessKeywords(keywords);

  if (keywords.length < BUSINESS_KEYWORD_MIN_COUNT) {
    return {
      keywords,
      message: `Please add at least ${BUSINESS_KEYWORD_MIN_COUNT} search keywords.`,
      ok: false,
      value: normalizedValue,
    };
  }

  if (keywords.length > BUSINESS_KEYWORD_MAX_COUNT) {
    return {
      keywords,
      message: `Please keep search keywords to ${BUSINESS_KEYWORD_MAX_COUNT} or fewer.`,
      ok: false,
      value: normalizedValue,
    };
  }

  const longKeyword = keywords.find(
    (keyword) => keyword.length > BUSINESS_KEYWORD_MAX_LENGTH,
  );

  if (longKeyword) {
    return {
      keywords,
      message: `Keep each search keyword under ${BUSINESS_KEYWORD_MAX_LENGTH} characters.`,
      ok: false,
      value: normalizedValue,
    };
  }

  return {
    keywords,
    ok: true,
    value: normalizedValue,
  };
}

function normalizeBusinessKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
