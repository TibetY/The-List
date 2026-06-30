import type { Restaurant } from '~/types/restaurant';

/** Display-decorated restaurant used by the dashboard and the public share view. */
export type DecoratedRestaurant = Restaurant & {
  initial: string;
  costStr: string;
  rated: boolean;
  ratingStr: string;
  meta: string;
  cuisine: string;
  isBeen: boolean;
  isWant: boolean;
};

const STAR_FULL = '★★★★★';
const STAR_EMPTY = '☆☆☆☆☆';

/** Derive the presentational fields (initial, star string, cuisine, status). */
export function decorate(r: Restaurant): DecoratedRestaurant {
  const rating = Math.round(r.rating ?? 0);
  const rated = rating > 0;
  const cuisine = r.cuisineType || r.placeTypes?.[0] || 'Restaurant';
  const status = r.status ?? 'want';
  return {
    ...r,
    initial: (r.name.replace(/^The /i, '')[0] || '?').toUpperCase(),
    costStr: r.priceRange || '',
    rated,
    ratingStr: rated
      ? STAR_FULL.slice(0, rating) + STAR_EMPTY.slice(0, 5 - rating)
      : '',
    cuisine,
    meta: cuisine,
    isBeen: status === 'been',
    isWant: status === 'want',
  };
}
