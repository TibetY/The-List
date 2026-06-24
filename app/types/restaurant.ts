export interface SocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}

export type RestaurantStatus = 'been' | 'want';

export interface Restaurant {
  id?: string;
  listId?: string; // The list this entry belongs to
  name: string;
  image?: string;
  url?: string;
  socialMedia?: SocialMediaLinks;
  rating?: number; // 0-5
  priceRange?: string; // $, $$, $$$, $$$$
  comment?: string;
  cuisineType?: string;
  status?: RestaurantStatus; // 'been' (visited) or 'want' (want to try)
  createdAt?: Date;
  updatedAt?: Date;
  addedBy?: string; // User who added this entry
}

export type RestaurantFormData = Omit<
  Restaurant,
  'id' | 'listId' | 'createdAt' | 'updatedAt' | 'addedBy'
>;

export type ListRole = 'owner' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface RestaurantList {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  role: ListRole; // The current user's role on this list
  memberCount?: number;
  createdAt?: Date;
}

export interface ListMember {
  id: string;
  listId: string;
  userId: string;
  role: ListRole;
  profile?: Profile;
}

export interface InviteLink {
  id: string;
  token: string;
  listId: string;
  role: Exclude<ListRole, 'owner'>;
  active: boolean;
}
