import type { Restaurant } from '~/types/restaurant';

/**
 * Aggregated stats for the "Your taste in food" recap. Everything here is derived
 * purely from a list's restaurants — no I/O, no formatting decisions — so the
 * recap UI (and its shareable card) can render it however the design dictates.
 */
export interface FoodStats {
  total: number;
  beenCount: number;
  wantCount: number;
  favoriteCount: number;
  ratedCount: number;
  /** Mean rating over rated places, to one decimal; null when nothing is rated. */
  averageRating: number | null;
  /** Places carrying at least one Michelin star. */
  michelinStarredCount: number;
  /** Sum of Michelin stars across the list. */
  totalMichelinStars: number;
  bibGourmandCount: number;
  totalVisits: number;
  /** Breakdown by declared cuisine, most common first. */
  cuisines: LabelCount[];
  /** Breakdown by price tier ($, $$, …), cheapest first. */
  priceTiers: LabelCount[];
  /** Best-effort breakdown by city (parsed from addresses), most common first. */
  cities: LabelCount[];
  /** Most-visited places, highest first. */
  topVisited: VisitedPlace[];
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface VisitedPlace {
  name: string;
  visitCount: number;
}

const DEFAULT_TOP_VISITED = 5;

/** Empty stats — used for an empty list so callers never special-case null. */
function emptyStats(): FoodStats {
  return {
    total: 0,
    beenCount: 0,
    wantCount: 0,
    favoriteCount: 0,
    ratedCount: 0,
    averageRating: null,
    michelinStarredCount: 0,
    totalMichelinStars: 0,
    bibGourmandCount: 0,
    totalVisits: 0,
    cuisines: [],
    priceTiers: [],
    cities: [],
    topVisited: [],
  };
}

/**
 * Compute the recap stats for a list of restaurants. Pure and side-effect free.
 * @param restaurants the list's restaurants (as loaded; not decorated)
 * @param topVisitedLimit how many entries to include in `topVisited`
 */
export function computeFoodStats(
  restaurants: Restaurant[],
  topVisitedLimit: number = DEFAULT_TOP_VISITED
): FoodStats {
  if (!restaurants || restaurants.length === 0) return emptyStats();

  const stats = emptyStats();
  stats.total = restaurants.length;

  const cuisineTally = new Map<string, number>();
  const priceTally = new Map<string, number>();
  const cityTally = new Map<string, number>();
  const visited: VisitedPlace[] = [];
  let ratingSum = 0;

  for (const r of restaurants) {
    if ((r.status ?? 'want') === 'been') stats.beenCount += 1;
    else stats.wantCount += 1;
    if (r.favorite) stats.favoriteCount += 1;

    const rating = r.rating ?? 0;
    if (rating > 0) {
      stats.ratedCount += 1;
      ratingSum += rating;
    }

    const stars = r.michelinStars ?? 0;
    if (stars > 0) {
      stats.michelinStarredCount += 1;
      stats.totalMichelinStars += stars;
    }
    if (r.bibGourmand) stats.bibGourmandCount += 1;

    const visits = r.visitCount ?? 0;
    stats.totalVisits += visits;
    if (visits > 0) visited.push({ name: r.name, visitCount: visits });

    const cuisine = r.cuisineType?.trim();
    if (cuisine) increment(cuisineTally, cuisine);

    const price = r.priceRange?.trim();
    if (price) increment(priceTally, price);

    // One tally per distinct city the place has a located branch in, so a
    // multi-branch restaurant in one city isn't double-counted.
    for (const city of citiesOf(r)) increment(cityTally, city);
  }

  stats.averageRating =
    stats.ratedCount > 0 ? Math.round((ratingSum / stats.ratedCount) * 10) / 10 : null;

  stats.cuisines = sortedByCount(cuisineTally);
  // Price tiers sort by the number of symbols ($ < $$ < …) rather than by count.
  stats.priceTiers = Array.from(priceTally.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.length - b.label.length);
  stats.cities = sortedByCount(cityTally);
  stats.topVisited = visited
    .sort((a, b) => b.visitCount - a.visitCount || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, topVisitedLimit));

  return stats;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Map entries → LabelCount[] sorted by count desc, then label asc for stability. */
function sortedByCount(map: Map<string, number>): LabelCount[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Distinct cities across a restaurant's located branches (best-effort). */
function citiesOf(r: Restaurant): string[] {
  const found = new Set<string>();
  for (const loc of r.locations ?? []) {
    const city = cityFromAddress(loc.address);
    if (city) found.add(city);
  }
  return Array.from(found);
}

const COUNTRY_WORDS = new Set([
  'canada',
  'usa',
  'us',
  'united states',
  'uk',
  'united kingdom',
  'france',
  'england',
  'scotland',
]);

/**
 * Best-effort city from a free-text address. There is no structured city field
 * yet, so we split on commas and pick the segment most likely to be the city:
 * skip the leading street line, then any segment that looks like a street
 * (contains a digit), a region/state abbreviation (two letters), or a country.
 * Returns null when we can't reasonably tell — callers just omit it.
 */
export function cityFromAddress(address?: string): string | null {
  if (!address) return null;
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null; // a bare street or single token — unsure
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    if (/\d/.test(seg)) continue; // still street-ish / postal
    if (/^[A-Za-z]{2}$/.test(seg)) continue; // region/state abbreviation
    if (COUNTRY_WORDS.has(seg.toLowerCase())) continue;
    return seg;
  }
  return null;
}
