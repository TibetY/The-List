/**
 * A small session cache for the user's coordinates, shared between "Nearby"
 * (which explicitly requests location on a tap) and plain text search (which
 * should benefit from it, but must NEVER trigger a permission prompt itself —
 * see NearbyAdds.tsx: "Opt-in, we never ask for location until the user taps").
 */
let cached: { lat: number; lng: number } | null = null;

export function getCachedLocation(): { lat: number; lng: number } | null {
  return cached;
}

export function setCachedLocation(lat: number, lng: number): void {
  cached = { lat, lng };
}

/**
 * Resolve the user's coordinates WITHOUT ever prompting for permission.
 * Returns the cached value if we already have one (e.g. from a prior "Nearby"
 * tap this session); otherwise, only if the Permissions API reports
 * geolocation is already `granted`, silently reads the position (this can't
 * prompt — permission is already granted) and caches it. Any other case
 * (not yet granted, denied, or the Permissions API is unavailable — e.g.
 * Safari) resolves `null` immediately rather than risking a surprise prompt.
 */
export async function getSilentLocation(): Promise<{ lat: number; lng: number } | null> {
  if (cached) return cached;
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  if (!navigator.permissions?.query) return null;

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state !== 'granted') return null;
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        cached = loc;
        resolve(loc);
      },
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}
