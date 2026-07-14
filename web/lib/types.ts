export type City = {
  name: string;
  slug: string;
  province: string;
  summary: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type Category = {
  name: string;
  slug: string;
  description: string;
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
  isFree: boolean;
  isOnline: boolean;
  price?: string;
  startsAt?: string;
  location?: string;
  linkUrl?: string;
  status: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
};

export type Business = {
  id: string;
  registrationId?: string;
  ownerId?: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  city: string;
  citySlug: string;
  neighborhood: string;
  servesAllCanada?: boolean;
  description: string;
  longDescription: string;
  phone: string;
  website: string;
  instagram: string;
  logoUrl: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  address: string;
  languages: string[];
  image: string;
  gallery: string[];
  featured: boolean;
  hours: string;
  tags: string[];
  contentItems?: BusinessContentItem[];
  distanceInKm?: number;
  verifiedAt?: string;
};
