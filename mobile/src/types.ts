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
};
