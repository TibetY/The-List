import type {
  Restaurant,
  RestaurantLocation,
  SocialMediaLinks,
} from '~/types/restaurant';
import { geocodeAddress } from './geocode.client';

/**
 * A place to enrich — the fields a search candidate or a starter-pack entry can
 * provide up front. Only name + address are required; everything else is filled
 * in from the web.
 */
export interface PlaceSeed {
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  cuisineType?: string | null;
  placeTypes?: string[] | null;
  website?: string | null;
}

const SOCIAL_KEYS = ['facebook', 'instagram', 'twitter', 'tiktok'] as const;

type ScrapeData = {
  image: string | null;
  cuisineType: string | null;
  reservationPlatform: 'resy' | 'opentable' | null;
  reservationUrl: string | null;
  email: string | null;
  phone: string | null;
  socialMedia?: Record<string, string | null> | null;
  priceRange?: string | null;
  michelinStars?: number | null;
  bibGourmand?: boolean | null;
};

type LookupData = ScrapeData & {
  website: string | null;
  placeTypes: string[] | null;
  dietaryTags?: string[] | null;
  lat?: number | null;
  lng?: number | null;
};

function currentLang(): string {
  return typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
}

/** Best-effort OSM lookup by name+address; null on any failure. */
async function lookupPlace(name: string, address: string): Promise<LookupData | null> {
  try {
    const res = await fetch(
      `/api/lookup-place?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}&lang=${encodeURIComponent(currentLang())}`
    );
    if (!res.ok) return null;
    return (await res.json()) as LookupData;
  } catch {
    return null;
  }
}

/** Best-effort website scrape; null on any failure. */
async function scrapeWebsite(url: string): Promise<ScrapeData | null> {
  try {
    const res = await fetch(`/api/scrape-website?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return (await res.json()) as ScrapeData;
  } catch {
    return null;
  }
}

/**
 * Turn a name+address (plus whatever a search candidate already knew) into a
 * ready-to-save restaurant: OSM extras (cuisine, place types, dietary, phone,
 * coordinates) + a website scrape (photo, reservation, socials, price, Michelin)
 * + a geocode fallback for the map pin. Never throws — the worst case is a
 * name+address payload, which still saves. This is the headless twin of the
 * add-form's enrichment, used by onboarding to add places in one tap.
 */
export async function buildEnrichedRestaurant(seed: PlaceSeed): Promise<Partial<Restaurant>> {
  const location: RestaurantLocation = {
    address: seed.address,
    lat: seed.lat ?? undefined,
    lng: seed.lng ?? undefined,
  };
  const payload: Partial<Restaurant> = {
    name: seed.name,
    status: 'want',
    priceRange: '$$',
    cuisineType: seed.cuisineType ?? undefined,
    placeTypes: seed.placeTypes ?? undefined,
    url: seed.website ?? undefined,
    locations: [location],
  };

  const lookup = await lookupPlace(seed.name, seed.address);
  if (lookup) {
    if (!payload.cuisineType && lookup.cuisineType) payload.cuisineType = lookup.cuisineType;
    if (!payload.placeTypes?.length && lookup.placeTypes?.length) {
      payload.placeTypes = lookup.placeTypes;
    }
    if (lookup.dietaryTags?.length) payload.dietaryTags = lookup.dietaryTags;
    if (!payload.url && lookup.website) payload.url = lookup.website;
    if (!location.phone && lookup.phone) location.phone = lookup.phone;
    if (!location.email && lookup.email) location.email = lookup.email;
    if (location.lat == null && lookup.lat != null) location.lat = lookup.lat;
    if (location.lng == null && lookup.lng != null) location.lng = lookup.lng;
  }

  if (payload.url) {
    const scrape = await scrapeWebsite(payload.url);
    if (scrape) {
      if (scrape.image) payload.image = scrape.image;
      if (!payload.cuisineType && scrape.cuisineType) payload.cuisineType = scrape.cuisineType;
      if (scrape.priceRange) payload.priceRange = scrape.priceRange;
      if (scrape.michelinStars) payload.michelinStars = scrape.michelinStars;
      if (scrape.bibGourmand) payload.bibGourmand = true;
      if (!location.reservationUrl && scrape.reservationUrl) {
        location.reservationUrl = scrape.reservationUrl;
      }
      if (!location.reservationPlatform && scrape.reservationPlatform) {
        location.reservationPlatform = scrape.reservationPlatform;
      }
      if (!location.email && scrape.email) location.email = scrape.email;
      if (!location.phone && scrape.phone) location.phone = scrape.phone;
      if (scrape.socialMedia) {
        const sm: SocialMediaLinks = {};
        for (const k of SOCIAL_KEYS) {
          const v = scrape.socialMedia[k];
          if (v) sm[k] = v;
        }
        if (Object.keys(sm).length) payload.socialMedia = sm;
      }
    }
  }

  // Ensure a map pin: geocode the address if we still have no coordinates.
  if (location.lat == null || location.lng == null) {
    const point = await geocodeAddress(seed.address);
    if (point) {
      location.lat = point.lat;
      location.lng = point.lng;
    }
  }

  payload.locations = [location];
  return payload;
}
