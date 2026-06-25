export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Geocode a free-form address to coordinates. Delegates to our own
 * `/api/geocode` resource route, which calls OpenStreetMap's Nominatim
 * server-side with the descriptive User-Agent its policy requires — this makes
 * international lookups far more reliable than an anonymous browser request.
 * Returns null if the address can't be resolved, so a save never fails just
 * because geocoding did.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const q = address.trim();
  if (!q) return null;
  const lang =
    typeof document !== 'undefined'
      ? document.documentElement.lang || 'en'
      : 'en';
  const url = `/api/geocode?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as GeoPoint | null;
    if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      return null;
    }
    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}
