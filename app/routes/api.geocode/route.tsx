import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

const FETCH_TIMEOUT_MS = 6000;

interface GeoResult {
  lat: number;
  lng: number;
}

/**
 * Server-side geocoding proxy for OpenStreetMap's Nominatim. Running it here (not
 * from the browser) lets us send the descriptive `User-Agent` Nominatim's usage
 * policy requires, which makes lookups — especially international ones — far more
 * reliable than an anonymous browser request. Returns null on any failure so a
 * save never breaks because geocoding did.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const lang = url.searchParams.get('lang') ?? 'en';
  if (!q) return json<GeoResult | null>(null);

  const target = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    q
  )}`;
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang,
        'User-Agent': 'TheFoodiedex/1.0 (restaurant list app)',
      },
    });
    if (!res.ok) return json<GeoResult | null>(null);
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return json<GeoResult | null>(null);
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return json<GeoResult | null>(null);
    return json<GeoResult>({ lat, lng });
  } catch {
    return json<GeoResult | null>(null);
  }
}
