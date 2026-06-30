import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { cuisineTypes } from '~/types/restaurant';

const FETCH_TIMEOUT_MS = 6000;

interface LookupResult {
  website: string | null;
  phone: string | null;
  email: string | null;
  cuisineType: string | null;
  placeTypes: string[] | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  reservationPlatform: null;
  reservationUrl: null;
}

const EMPTY: LookupResult = {
  website: null,
  phone: null,
  email: null,
  cuisineType: null,
  placeTypes: null,
  address: null,
  lat: null,
  lng: null,
  reservationPlatform: null,
  reservationUrl: null,
};

/**
 * Enrich a restaurant from just a name + address (no website needed) using
 * OpenStreetMap Nominatim. Like /api/geocode it runs server-side with the
 * descriptive User-Agent Nominatim's policy requires, and never throws — a miss
 * just yields an empty result so the add/edit form degrades gracefully. The
 * `website` it returns is handed back to the client, which passes it to
 * /api/scrape-website (where the SSRF guard lives) to grab the photo + booking.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const name = (params.get('name') ?? '').trim();
  const address = (params.get('address') ?? '').trim();
  const lang = params.get('lang') ?? 'en';
  if (!name || !address) return json(EMPTY);

  const q = `${name}, ${address}`;
  const target =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1` +
    `&extratags=1&addressdetails=1&namedetails=1&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang,
        'User-Agent': 'TheFoodiedex/1.0 (restaurant list app)',
      },
    });
    if (!res.ok) return json(EMPTY);
    const data = (await res.json()) as NominatimPlace[];
    const place = data[0];
    if (!place) return json(EMPTY);
    return json(toLookupResult(place));
  } catch {
    return json(EMPTY);
  }
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  extratags?: Record<string, string> | null;
}

function toLookupResult(place: NominatimPlace): LookupResult {
  const tags = place.extratags ?? {};
  const lat = place.lat ? parseFloat(place.lat) : NaN;
  const lng = place.lon ? parseFloat(place.lon) : NaN;

  return {
    website: normalizeWebsite(tags.website ?? tags['contact:website']),
    phone: firstNonEmpty(tags.phone, tags['contact:phone']),
    email: firstNonEmpty(tags.email, tags['contact:email']),
    cuisineType: matchCuisine(tags.cuisine),
    placeTypes: mapPlaceTypes(place),
    address: null, // never overwrite the address the user typed
    lat: Number.isNaN(lat) ? null : lat,
    lng: Number.isNaN(lng) ? null : lng,
    reservationPlatform: null,
    reservationUrl: null,
  };
}

function firstNonEmpty(...values: (string | undefined)[]): string | null {
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) return trimmed;
  }
  return null;
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
    bakery: 'Bakery',
    pastry: 'Bakery',
  };
  const mapped = map[type];
  return mapped ? [mapped] : null;
}
