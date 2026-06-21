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
  description: string;
  longDescription: string;
  phone: string;
  website: string;
  instagram: string;
  address: string;
  languages: string[];
  image: string;
  gallery: string[];
  featured: boolean;
  hours: string;
  tags: string[];
  distanceInKm?: number;
  verifiedAt?: string;
};
