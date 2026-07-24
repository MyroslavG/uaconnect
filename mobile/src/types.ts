export type Locale = "uk" | "en";

export type Category = {
  slug: string;
  name: Record<Locale, string>;
};

export type Business = {
  id: string;
  registrationId?: string;
  ownerId?: string;
  slug?: string;
  name: string;
  categorySlug: string;
  city: string;
  address?: string;
  ownerName: string;
  ownerAvatarUrl?: string;
  description: string;
  phone: string;
  website: string;
  instagram?: string;
  logoUrl?: string;
  servesAllCanada: boolean;
  ownedByCurrentUser?: boolean;
  isSaved?: boolean;
  contentItems?: BusinessContentItem[];
};

export type BusinessContentType = "service" | "event";

export type BusinessContentItem = {
  id: string;
  registrationId: string;
  ownerId: string;
  type: BusinessContentType;
  title: string;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  isFree: boolean;
  isOnline: boolean;
  price?: string;
  startsAt?: string;
  location?: string;
  linkUrl?: string;
  status: "draft" | "published";
  createdAt?: string;
};

export type BusinessContentInput = {
  registrationId: string;
  type: BusinessContentType;
  title: string;
  description: string;
  image?: BusinessContentImageInput | null;
  images?: BusinessContentImageInput[];
  isFree: boolean;
  isOnline: boolean;
  price?: string;
  startsAt?: string;
  location?: string;
  linkUrl?: string;
};

export type BusinessContentUpdateInput = BusinessContentInput & {
  id: string;
};

export type BusinessContentImageInput = {
  base64?: string | null;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};
