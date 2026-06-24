export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Geocode a free-form address to coordinates using OpenStreetMap's Nominatim
 * service (no API key required). Runs in the browser and returns null if the
 * address can't be resolved, so a save never fails just because geocoding did.
 *
 * Nominatim asks for low request volume (≈1/sec); we only call it on save when
 * the address actually changes, which keeps us well within that.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const q = address.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    q
  )}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
