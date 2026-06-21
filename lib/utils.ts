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
