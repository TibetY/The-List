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
  'Turkish',
  'Lebanese',
  'Ethiopian',
  'Caribbean',
  'Brazilian',
  'Peruvian',
  'German',
  'Portuguese',
  'Filipino',
  'Indonesian',
  'Malaysian',
  'Moroccan',
  'Persian',
  'Seafood',
  'Steakhouse',
  'BBQ',
  'Pizza',
  'Burgers',
  'Sushi',
  'Ramen',
  'Fusion',
  'Other', // When selected, the user types a free-text cuisine stored in cuisineType.
];

/** Dietary options, multi-select. Stored as a string[] on the restaurant. */
export const dietaryTags = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-Free',
] as const;

/** Place types, multi-select (a venue can be e.g. both a Bar and a Cafe). */
export const placeTypes = ['Restaurant', 'Bar', 'Cafe', 'Bakery'] as const;

export interface Restaurant {
  id?: string;
  listId?: string; // The list this entry belongs to
  name: string;
  image?: string;
  url?: string;
  socialMedia?: SocialMediaLinks;
  rating?: number; // 0-5
  priceRange?: string; // $, $$, $$$, $$$$, $$$$$
  comment?: string;
  cuisineType?: string;
  dietaryTags?: string[]; // e.g. Vegan, Halal — multi-select
  placeTypes?: string[]; // e.g. Restaurant, Bar, Cafe — multi-select
  michelinStars?: number; // 0-3 Michelin stars
  bibGourmand?: boolean; // Michelin Bib Gourmand recognition
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
