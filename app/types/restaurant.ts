export interface SocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}

export type RestaurantStatus = 'been' | 'want';

export type ReservationPlatform = 'resy' | 'opentable' | string;

/** Shared with the website-scrape endpoint, which only ever returns one of these. */
export const cuisineTypes = [
  'Italian',
  'Chinese',
  'Japanese',
  'Mexican',
  'Indian',
  'Thai',
  'French',
  'American',
  'Mediterranean',
  'Korean',
  'Vietnamese',
  'Greek',
  'Spanish',
  'Other',
];

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
  reservationPlatform?: ReservationPlatform;
  reservationUrl?: string;
  status?: RestaurantStatus; // 'been' (visited) or 'want' (want to try)
  address?: string; // Human-entered address, used for the map
  lat?: number; // Geocoded latitude (set on save from the address)
  lng?: number; // Geocoded longitude
  createdAt?: string; // ISO timestamp from the DB (serialized over the wire)
  updatedAt?: string;
  addedBy?: string; // User who added this entry
}

export type RestaurantFormData = Omit<
  Restaurant,
  'id' | 'listId' | 'createdAt' | 'updatedAt' | 'addedBy' | 'lat' | 'lng'
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
  createdAt?: string; // ISO timestamp from the DB (serialized over the wire)
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
