import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function titleCaseFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatExternalUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function formatPriceWithCurrency(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.includes("$")) {
    return trimmedValue;
  }

  return trimmedValue.replace(/\d/, (digit) => `$${digit}`);
}

export function getSafeImageUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export type ImageOptimizationOptions = {
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
  width?: number;
};

export const imageOptimizationPresets = {
  avatar: { height: 160, quality: 70, resize: "cover", width: 160 },
  detail: { quality: 72, resize: "contain", width: 1200 },
  logo: { height: 220, quality: 72, resize: "contain", width: 220 },
  thumbnail: { height: 520, quality: 62, resize: "cover", width: 520 },
} satisfies Record<string, ImageOptimizationOptions>;

export function getOptimizedImageUrl(
  value: string | null | undefined,
  options: ImageOptimizationOptions = imageOptimizationPresets.detail,
) {
  const safeImageUrl = getSafeImageUrl(value);

  if (!safeImageUrl) {
    return "";
  }

  try {
    const url = new URL(safeImageUrl);
    const publicObjectPath = "/storage/v1/object/public/";
    const renderImagePath = "/storage/v1/render/image/public/";

    if (
      !url.pathname.includes(publicObjectPath) &&
      !url.pathname.includes(renderImagePath)
    ) {
      return safeImageUrl;
    }

    if (/\.(svg)(\?|$)/i.test(url.pathname)) {
      return safeImageUrl;
    }

    url.pathname = url.pathname.replace(publicObjectPath, renderImagePath);

    if (options.width) {
      url.searchParams.set("width", String(options.width));
    }

    if (options.height) {
      url.searchParams.set("height", String(options.height));
    }

    if (options.quality) {
      url.searchParams.set("quality", String(options.quality));
    }

    if (options.resize) {
      url.searchParams.set("resize", options.resize);
    }

    return url.toString();
  } catch {
    return safeImageUrl;
  }
}

export function formatLocationParts(...parts: Array<string | null | undefined>) {
  const normalizedParts = new Set<string>();
  const displayParts = parts
    .map((part) => part?.trim() ?? "")
    .filter((part) => {
      if (!part) {
        return false;
      }

      const normalizedPart = part.toLowerCase();

      if (normalizedParts.has(normalizedPart)) {
        return false;
      }

      normalizedParts.add(normalizedPart);
      return true;
    });

  return displayParts.join(", ");
}

export function getInstagramUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(www\.)?instagram\.com\//i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  const handle = trimmedValue
    .replace(/^@+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split(/[/?#]/)[0];

  return `https://www.instagram.com/${handle}`;
}

export function formatInstagramHandle(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const handle = trimmedValue
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split(/[/?#]/)[0];

  return handle ? `@${handle}` : trimmedValue;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
