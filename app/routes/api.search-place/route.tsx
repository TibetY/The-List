import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { cuisineTypes } from '~/types/restaurant';

const FETCH_TIMEOUT_MS = 6000;
const MAX_RESULTS = 6;

/**
 * A single place candidate returned by the search. This is the stable contract
 * the search-first "Add a place" UI builds on: enough to show a picker row
 * (name / address / cuisine) and to seed the add form (lat/lng + website), after
 * which the client runs the existing lookup + scrape enrichment chain.
 */
export interface PlaceCandidate {
  /** Best display name (namedetails → head of display_name). */
  name: string;
  /** Compact human address (display_name minus the leading name). */
  address: string;
  lat: number | null;
  lng: number | null;
  /** One of our cuisineTypes when OSM's cuisine tag maps cleanly, else null. */
  cuisineType: string | null;
  /** One of our placeTypes (Restaurant / Bar / Cafe / Bakery) when known. */
  placeTypes: string[] | null;
  /** http(s) website when OSM has one, normalized; else null. */
  website: string | null;
}

/**
 * Search for restaurant/bar/cafe candidates by free-text query (name, or name +
 * city) using OpenStreetMap Nominatim. Mirrors /api/lookup-place: runs
 * server-side with the descriptive User-Agent Nominatim's policy requires, uses a
 * short timeout, and NEVER throws — any miss/error yields `[]` so the add flow
 * degrades gracefully. Returns up to MAX_RESULTS ranked candidates (Nominatim
 * orders by importance). The client seeds the form from a chosen candidate and
 * then passes its website to /api/scrape-website (where the SSRF guard lives).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const query = (params.get('query') ?? '').trim();
  const lang = params.get('lang') ?? 'en';
  // Too-short queries just waste a Nominatim call and return noise.
  if (query.length < 2) return json<PlaceCandidate[]>([]);

  const target =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${MAX_RESULTS}` +
    `&extratags=1&addressdetails=1&namedetails=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang,
        'User-Agent': 'TheFoodiedex/1.0 (restaurant list app)',
      },
    });
    if (!res.ok) return json<PlaceCandidate[]>([]);
    const data = (await res.json()) as NominatimPlace[];
    if (!Array.isArray(data)) return json<PlaceCandidate[]>([]);
    // Keep only food/drink venues; a name-only search can otherwise surface
    // roads, regions, or shops that aren't places you'd add to the list.
    const candidates = data
      .filter(isFoodVenue)
      .map(toCandidate)
      .filter((c): c is PlaceCandidate => c !== null);
    return json<PlaceCandidate[]>(candidates);
  } catch {
    return json<PlaceCandidate[]>([]);
  }
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  display_name?: string;
  name?: string;
  namedetails?: Record<string, string> | null;
  extratags?: Record<string, string> | null;
  address?: Record<string, string> | null;
}

/** Category/type values that represent a place you'd journal (eat/drink). */
const FOOD_TYPES = new Set([
  'restaurant',
  'fast_food',
  'food_court',
  'bar',
  'pub',
  'biergarten',
  'cafe',
  'bakery',
  'pastry',
  'ice_cream',
]);

function isFoodVenue(place: NominatimPlace): boolean {
  const type = (place.type ?? '').toLowerCase();
  // `amenity`/`shop` come back as the jsonv2 `category`; the specific value is
  // `type`. Accept the known food/drink types; be lenient when category is
  // amenity and the type is unknown but there's a food-ish tag.
  if (FOOD_TYPES.has(type)) return true;
  const tags = place.extratags ?? {};
  return Boolean(tags.cuisine);
}

function toCandidate(place: NominatimPlace): PlaceCandidate | null {
  const lat = place.lat ? parseFloat(place.lat) : NaN;
  const lng = place.lon ? parseFloat(place.lon) : NaN;
  const name = deriveName(place);
  if (!name) return null;
  const tags = place.extratags ?? {};

  return {
    name,
    address: deriveAddress(place, name),
    lat: Number.isNaN(lat) ? null : lat,
    lng: Number.isNaN(lng) ? null : lng,
    cuisineType: matchCuisine(tags.cuisine),
    placeTypes: mapPlaceTypes(place),
    website: normalizeWebsite(tags.website ?? tags['contact:website']),
  };
}

/** Prefer the localized namedetails name, then the plain name, then the head of
 *  display_name (everything before the first comma). */
function deriveName(place: NominatimPlace): string {
  const nd = place.namedetails ?? {};
  const fromNames = nd.name || nd['name:en'] || place.name;
  if (fromNames?.trim()) return fromNames.trim();
  const head = (place.display_name ?? '').split(',')[0]?.trim();
  return head ?? '';
}

/** A compact address: display_name with the leading name segment dropped when it
 *  duplicates the venue name (Nominatim repeats it), else the full display_name. */
function deriveAddress(place: NominatimPlace, name: string): string {
  const full = (place.display_name ?? '').trim();
  if (!full) return '';
  const parts = full.split(',').map((s) => s.trim());
  if (parts[0]?.toLowerCase() === name.toLowerCase()) {
    return parts.slice(1).join(', ');
  }
  return full;
}

/** OSM website tags sometimes lack a scheme; only return a usable http(s) URL. */
function normalizeWebsite(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+/.test(v)) return `https://${v}`;
  return null;
}

/** A few OSM cuisine spellings that don't map 1:1 to our cuisineTypes list. */
const CUISINE_ALIASES: Record<string, string> = {
  burger: 'Burgers',
  barbecue: 'BBQ',
  bbq: 'BBQ',
  steak_house: 'Steakhouse',
  steak: 'Steakhouse',
  coffee_shop: 'Cafe',
  pizza: 'Pizza',
  sushi: 'Sushi',
  ramen: 'Ramen',
};

/** Map an OSM `cuisine` tag (lowercase, possibly `a;b;c`) to a known cuisine. */
function matchCuisine(raw: string | undefined): string | null {
  if (!raw) return null;
  for (const token of raw.split(';').map((s) => s.trim().toLowerCase())) {
    if (!token) continue;
    const alias = CUISINE_ALIASES[token];
    if (alias && cuisineTypes.includes(alias)) return alias;
    const direct = cuisineTypes.find((c) => c.toLowerCase() === token);
    if (direct && direct !== 'Other') return direct;
  }
  return null;
}

/** Map the POI's category/type (jsonv2) to our place-type facet. */
function mapPlaceTypes(place: NominatimPlace): string[] | null {
  const type = (place.type ?? '').toLowerCase();
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    fast_food: 'Restaurant',
    food_court: 'Restaurant',
    bar: 'Bar',
    pub: 'Bar',
    biergarten: 'Bar',
    cafe: 'Cafe',
    ice_cream: 'Cafe',
    bakery: 'Bakery',
    pastry: 'Bakery',
  };
  const mapped = map[type];
  return mapped ? [mapped] : null;
}
