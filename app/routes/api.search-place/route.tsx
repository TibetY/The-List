import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { cuisineTypes, type PlaceCandidate } from '~/types/restaurant';
import { haversineM } from '~/utils/geo';

export type { PlaceCandidate };

const FETCH_TIMEOUT_MS = 6000;
const MAX_RESULTS = 6;

/** The OSM amenity/shop tags Photon is asked to prefilter to (OR'd). */
const PHOTON_TAG_FILTERS = [
  'amenity:restaurant',
  'amenity:cafe',
  'amenity:bar',
  'amenity:pub',
  'amenity:fast_food',
  'amenity:biergarten',
  'amenity:food_court',
  'amenity:ice_cream',
  'shop:bakery',
];

/** The user's coordinates, when available — never required, only ever used to
 *  softly re-rank results toward them (never to exclude distant matches). */
export interface Bias {
  lat: number;
  lng: number;
}

/** Exported for testing. */
export function parseBias(params: URLSearchParams): Bias | undefined {
  const lat = parseFloat(params.get('lat') ?? '');
  const lng = parseFloat(params.get('lng') ?? '');
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

/** Attach `distanceM` to every candidate that has coordinates, so the client
 *  can show "0.4 km" the same way the Nearby endpoint does. Exported for
 *  testing. */
export function withDistances(candidates: PlaceCandidate[], bias: Bias | undefined): PlaceCandidate[] {
  if (!bias) return candidates;
  return candidates.map((c) =>
    typeof c.lat === 'number' && typeof c.lng === 'number'
      ? { ...c, distanceM: Math.round(haversineM(bias.lat, bias.lng, c.lat, c.lng)) }
      : c
  );
}

/**
 * Search for restaurant/bar/cafe candidates by free-text query. Primary source
 * is **Photon** (photon.komoot.io) — an OSM search built for autocomplete, with
 * typo-tolerant prefix matching, which is far stronger for venue NAMES than
 * Nominatim's address-geocoder search. When Photon errors or finds nothing, we
 * fall back to the original Nominatim query. Both paths run server-side with a
 * short timeout and NEVER throw — any miss yields `[]` so the add flow degrades
 * gracefully. The client seeds the form from a chosen candidate and then runs
 * the lookup + scrape chain (which discovers websites; /api/scrape-website
 * carries the SSRF guard).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const query = (params.get('query') ?? '').trim();
  const lang = params.get('lang') ?? 'en';
  const bias = parseBias(params);
  // Too-short queries just waste an upstream call and return noise.
  if (query.length < 2) return json<PlaceCandidate[]>([]);

  const photon = await searchPhoton(query, lang, bias);
  if (photon.length > 0) return json<PlaceCandidate[]>(withDistances(photon, bias));
  return json<PlaceCandidate[]>(withDistances(await searchNominatim(query, lang, bias), bias));
}

/** Photon query (never throws). */
async function searchPhoton(query: string, lang: string, bias?: Bias): Promise<PlaceCandidate[]> {
  // Photon only supports a handful of languages; anything else falls back to
  // its default rather than erroring.
  const langParam = ['en', 'fr', 'de'].includes(lang) ? `&lang=${lang}` : '';
  const tagParams = PHOTON_TAG_FILTERS.map((t) => `&osm_tag=${encodeURIComponent(t)}`).join('');
  // Photon re-ranks toward lat/lon (soft bias — it still returns strong
  // name matches from anywhere) rather than excluding distant results.
  const biasParams = bias ? `&lat=${bias.lat}&lon=${bias.lng}` : '';
  const target =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&limit=${MAX_RESULTS}${langParam}${tagParams}${biasParams}`;
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TheFoodiedex/1.0 (restaurant list app)',
      },
    });
    if (!res.ok) return [];
    return parsePhotonCandidates(await res.json());
  } catch {
    return [];
  }
}

/** Original Nominatim query, kept as the fallback (never throws). */
async function searchNominatim(query: string, lang: string, bias?: Bias): Promise<PlaceCandidate[]> {
  // `bounded=0` keeps the viewbox a soft preference — Nominatim ranks matches
  // inside it higher but still returns strong matches from outside it, so a
  // uniquely-named place across the world is never hidden, just outranked.
  const viewboxParams = bias
    ? `&viewbox=${bias.lng - 0.35},${bias.lat + 0.35},${bias.lng + 0.35},${bias.lat - 0.35}&bounded=0`
    : '';
  const target =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${MAX_RESULTS}` +
    `&extratags=1&addressdetails=1&namedetails=1&q=${encodeURIComponent(query)}${viewboxParams}`;
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang,
        'User-Agent': 'TheFoodiedex/1.0 (restaurant list app)',
      },
    });
    if (!res.ok) return [];
    return parsePlaceCandidates(await res.json());
  } catch {
    return [];
  }
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] } | null;
  properties?: {
    name?: string;
    osm_key?: string;
    osm_value?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;
}

/**
 * Map a Photon GeoJSON response into ranked candidates, keeping only food/drink
 * venues. Exported for unit tests. Photon carries no cuisine/website tags — the
 * client's lookup + scrape chain fills those after a pick.
 */
export function parsePhotonCandidates(data: unknown): PlaceCandidate[] {
  const features =
    data && typeof data === 'object' && Array.isArray((data as { features?: unknown }).features)
      ? ((data as { features: PhotonFeature[] }).features)
      : [];
  const seen = new Set<string>();
  const out: PlaceCandidate[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    const name = p.name?.trim();
    if (!name) continue;
    const key = (p.osm_key ?? '').toLowerCase();
    const value = (p.osm_value ?? '').toLowerCase();
    const isFood =
      (key === 'amenity' && FOOD_TYPES.has(value)) || (key === 'shop' && value === 'bakery');
    if (!isFood) continue;
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
    const address = [streetLine, p.city, p.state, p.country].filter(Boolean).join(', ');
    const dedupeKey = `${name.toLowerCase()}|${(p.city ?? '').toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({
      name,
      address,
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      cuisineType: null,
      placeTypes: value === 'bakery' ? ['Bakery'] : mapPlaceTypes({ type: value }),
      website: null,
    });
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

/**
 * Map a raw Nominatim search response into ranked place candidates, keeping only
 * food/drink venues (a name-only search can otherwise surface roads, regions, or
 * shops that aren't places you'd add to the list). Exported so the parsing can be
 * unit-tested against representative payloads without a live network call.
 */
export function parsePlaceCandidates(data: unknown): PlaceCandidate[] {
  if (!Array.isArray(data)) return [];
  return (data as NominatimPlace[])
    .filter(isFoodVenue)
    .map(toCandidate)
    .filter((c): c is PlaceCandidate => c !== null);
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
  // `type`. Accept the known food/drink types; be lenient when the category is
  // amenity and the type is unknown but a cuisine tag is declared — but never
  // for other categories (a shop=convenience or a road can carry a cuisine tag).
  if (FOOD_TYPES.has(type)) return true;
  const category = (place.category ?? '').toLowerCase();
  return category === 'amenity' && Boolean(place.extratags?.cuisine);
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
