import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { cuisineTypes, type PlaceCandidate } from '~/types/restaurant';

export type { PlaceCandidate };

const FETCH_TIMEOUT_MS = 8000;
const MAX_RESULTS = 12;
const DEFAULT_RADIUS_M = 1200;

/**
 * "Nearby, right now" — food/drink venues around the user's coordinates, for
 * zero-typing adds. Uses the OpenStreetMap **Overpass** API (better at radial POI
 * queries than Nominatim), server-side with the descriptive User-Agent, a short
 * timeout, and a never-throw contract (→ `[]`). Candidates carry `distanceM` and
 * come back nearest-first.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const lat = parseFloat(params.get('lat') ?? '');
  const lng = parseFloat(params.get('lng') ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) return json<PlaceCandidate[]>([]);
  const radius = Math.min(
    3000,
    Math.max(200, parseInt(params.get('radius') ?? '', 10) || DEFAULT_RADIUS_M)
  );

  const q =
    `[out:json][timeout:8];(` +
    `node["amenity"~"^(restaurant|cafe|bar|fast_food|pub|biergarten|ice_cream)$"](around:${radius},${lat},${lng});` +
    `node["shop"="bakery"](around:${radius},${lat},${lng});` +
    `);out ${MAX_RESULTS * 3};`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'TheFoodiedex/1.0 (restaurant list app)',
      },
      body: `data=${encodeURIComponent(q)}`,
    });
    if (!res.ok) return json<PlaceCandidate[]>([]);
    const data = await res.json();
    return json<PlaceCandidate[]>(parseOverpassNearby(data, lat, lng));
  } catch {
    return json<PlaceCandidate[]>([]);
  }
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  tags?: Record<string, string> | null;
}

/** Map an Overpass response into nearest-first candidates. Exported for testing. */
export function parseOverpassNearby(
  data: unknown,
  userLat: number,
  userLng: number
): PlaceCandidate[] {
  const elements =
    data && typeof data === 'object' && Array.isArray((data as { elements?: unknown }).elements)
      ? ((data as { elements: OverpassElement[] }).elements)
      : [];

  const out: PlaceCandidate[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name || typeof el.lat !== 'number' || typeof el.lon !== 'number') continue;
    out.push({
      name,
      address: composeAddress(tags),
      lat: el.lat,
      lng: el.lon,
      cuisineType: matchCuisine(tags.cuisine),
      placeTypes: mapPlaceTypes(tags),
      website: normalizeWebsite(tags.website ?? tags['contact:website']),
      distanceM: Math.round(haversineM(userLat, userLng, el.lat, el.lon)),
    });
  }
  // Nearest first; de-dupe by name+rounded distance to avoid split multipolygons.
  const seen = new Set<string>();
  return out
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
    .filter((c) => {
      const key = `${c.name.toLowerCase()}|${Math.round((c.distanceM ?? 0) / 25)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

/** Great-circle distance in metres. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function composeAddress(tags: Record<string, string>): string {
  const line = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [line, tags['addr:city']].filter(Boolean).join(', ');
}

function normalizeWebsite(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+/.test(v)) return `https://${v}`;
  return null;
}

const CUISINE_ALIASES: Record<string, string> = {
  burger: 'Burgers',
  barbecue: 'BBQ',
  bbq: 'BBQ',
  steak_house: 'Steakhouse',
  coffee_shop: 'Cafe',
  pizza: 'Pizza',
  sushi: 'Sushi',
  ramen: 'Ramen',
};

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

function mapPlaceTypes(tags: Record<string, string>): string[] | null {
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    fast_food: 'Restaurant',
    bar: 'Bar',
    pub: 'Bar',
    biergarten: 'Bar',
    cafe: 'Cafe',
    ice_cream: 'Cafe',
  };
  if (tags.shop === 'bakery') return ['Bakery'];
  const mapped = map[(tags.amenity ?? '').toLowerCase()];
  return mapped ? [mapped] : null;
}
