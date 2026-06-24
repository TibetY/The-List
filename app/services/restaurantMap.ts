import type { Restaurant, SocialMediaLinks } from '~/types/restaurant';

/** Shape of a row in the public.restaurants table (snake_case). */
export interface RestaurantRow {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  url: string | null;
  social_media: SocialMediaLinks | null;
  rating: number | null;
  price_range: string | null;
  comment: string | null;
  cuisine_type: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Convert a database row into the app's camelCase Restaurant. */
export function rowToRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    image: row.image ?? undefined,
    url: row.url ?? undefined,
    socialMedia: row.social_media ?? undefined,
    rating: row.rating ?? undefined,
    priceRange: row.price_range ?? undefined,
    comment: row.comment ?? undefined,
    cuisineType: row.cuisine_type ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

/**
 * Convert app data into a row payload for insert/update. `created_at` /
 * `updated_at` are managed by the database, and `user_id` is set explicitly so
 * it satisfies the row-level-security check.
 */
export function restaurantToRow(
  data: Partial<Restaurant>,
  userId: string
): Omit<RestaurantRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: data.name ?? '',
    image: data.image ?? null,
    url: data.url ?? null,
    social_media: data.socialMedia ?? {},
    rating: data.rating ?? null,
    price_range: data.priceRange ?? null,
    comment: data.comment ?? null,
    cuisine_type: data.cuisineType ?? null,
  };
}
