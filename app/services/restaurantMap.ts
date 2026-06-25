import type {
  Restaurant,
  RestaurantStatus,
  SocialMediaLinks,
} from '~/types/restaurant';

/** Shape of a row in the public.restaurants table (snake_case). */
export interface RestaurantRow {
  id: string;
  list_id: string | null;
  added_by: string | null;
  name: string;
  image: string | null;
  url: string | null;
  social_media: SocialMediaLinks | null;
  rating: number | null;
  price_range: string | null;
  comment: string | null;
  cuisine_type: string | null;
  dietary_tags: string[] | null;
  place_types: string[] | null;
  michelin_stars: number | null;
  bib_gourmand: boolean | null;
  reservation_platform: string | null;
  reservation_url: string | null;
  email: string | null;
  phone: string | null;
  status: RestaurantStatus | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Convert a database row into the app's camelCase Restaurant. */
export function rowToRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    listId: row.list_id ?? undefined,
    addedBy: row.added_by ?? undefined,
    name: row.name,
    image: row.image ?? undefined,
    url: row.url ?? undefined,
    socialMedia: row.social_media ?? undefined,
    rating: row.rating ?? undefined,
    priceRange: row.price_range ?? undefined,
    comment: row.comment ?? undefined,
    cuisineType: row.cuisine_type ?? undefined,
    dietaryTags: row.dietary_tags ?? undefined,
    placeTypes: row.place_types ?? undefined,
    michelinStars: row.michelin_stars ?? undefined,
    bibGourmand: row.bib_gourmand ?? undefined,
    reservationPlatform: row.reservation_platform ?? undefined,
    reservationUrl: row.reservation_url ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status ?? 'want',
    address: row.address ?? undefined,
    lat: row.latitude ?? undefined,
    lng: row.longitude ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/**
 * Convert app data into a row payload for insert/update. `created_at` /
 * `updated_at` are managed by the database. `list_id` and `added_by` are set
 * explicitly so the rows satisfy the row-level-security checks.
 */
export function restaurantToRow(
  data: Partial<Restaurant>,
  listId: string,
  addedBy: string
): Omit<RestaurantRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    list_id: listId,
    added_by: addedBy,
    name: data.name ?? '',
    image: data.image ?? null,
    url: data.url ?? null,
    social_media: data.socialMedia ?? {},
    rating: data.rating ?? null,
    price_range: data.priceRange ?? null,
    comment: data.comment ?? null,
    cuisine_type: data.cuisineType ?? null,
    dietary_tags: data.dietaryTags ?? [],
    place_types: data.placeTypes ?? [],
    michelin_stars: data.michelinStars ?? 0,
    bib_gourmand: data.bibGourmand ?? false,
    reservation_platform: data.reservationPlatform ?? null,
    reservation_url: data.reservationUrl ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    status: data.status ?? 'want',
    address: data.address ?? null,
    latitude: data.lat ?? null,
    longitude: data.lng ?? null,
  };
}
