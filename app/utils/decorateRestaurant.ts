import type { Restaurant } from '~/types/restaurant';
import { cityFromAddress } from '~/utils/foodStats';

/** Display-decorated restaurant used by the dashboard and the public share view. */
export type DecoratedRestaurant = Restaurant & {
  initial: string;
  costStr: string;
  rated: boolean;
  meta: string;
  cuisine: string;
  /** Best-effort city of the first located branch (heuristic; may be null). */
  city: string | null;
  isBeen: boolean;
  isWant: boolean;
};

/** Derive the presentational fields (initial, cuisine, city, status). Half-star
 *  display is handled by the <Stars> component from the raw `rating`, so no star
 *  string is precomputed here (that rounding is what dropped the half-stars). */
export function decorate(r: Restaurant): DecoratedRestaurant {
  const cuisine = r.cuisineType || r.placeTypes?.[0] || 'Restaurant';
  const status = r.status ?? 'want';
  return {
    ...r,
    initial: (r.name.replace(/^The /i, '')[0] || '?').toUpperCase(),
    costStr: r.priceRange || '',
    rated: (r.rating ?? 0) > 0,
    cuisine,
    meta: cuisine,
    city: cityFromAddress((r.locations ?? []).find((l) => l.address?.trim())?.address),
    isBeen: status === 'been',
    isWant: status === 'want',
  };
}
