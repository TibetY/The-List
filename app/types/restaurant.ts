export interface SocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}

export interface Restaurant {
  id?: string;
  name: string;
  image?: string;
  url?: string;
  socialMedia?: SocialMediaLinks;
  rating?: number; // 0-5
  priceRange?: string; // $, $$, $$$, $$$$
  comment?: string;
  cuisineType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId: string; // Owner of this restaurant entry
}

export type RestaurantFormData = Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
