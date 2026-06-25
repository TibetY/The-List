import type {
  Restaurant,
  RestaurantLocation,
  RestaurantStatus,
  SocialMediaLinks,
} from '~/types/restaurant';

/** Shape of a row in the public.restaurants table (snake_case). */
export interface RestaurantRow {
  id: string;
  list_id: string | null;
  added_by: string | null;
  name: string;
  image: string | null;
  url: string | null;
  social_media: SocialMediaLinks | null;
  rating: number | null;
  price_range: string | null;
  comment: string | null;
  cuisine_type: string | null;
  dietary_tags: string[] | null;
  place_types: string[] | null;
  menu_types: string[] | null;
  michelin_stars: number | null;
  bib_gourmand: boolean | null;
  reservation_platform: string | null;
  reservation_url: string | null;
  email: string | null;
  phone: string | null;
  status: RestaurantStatus | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  locations: RestaurantLocation[] | null;
  created_at: string | null;
  updated_at: string | null;
}

/** True when a location object carries any meaningful data. */
function hasLocationData(loc: RestaurantLocation | undefined | null): boolean {
  if (!loc) return false;
  return Boolean(
    loc.address ||
      loc.lat != null ||
      loc.lng != null ||
      loc.phone ||
      loc.email ||
      loc.reservationUrl ||
      loc.reservationPlatform ||
      loc.label
  );
}

/**
 * Resolve a row's locations: prefer the JSONB `locations` array; fall back to
 * synthesizing a single location from the legacy scalar columns for rows that
 * predate the column (or weren't backfilled yet).
 */
function locationsFromRow(row: RestaurantRow): RestaurantLocation[] {
  const fromJson = Array.isArray(row.locations)
    ? row.locations.filter(hasLocationData)
    : [];
  if (fromJson.length > 0) return fromJson;

  const legacy: RestaurantLocation = {
    address: row.address ?? undefined,
    lat: row.latitude ?? undefined,
    lng: row.longitude ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    reservationPlatform: row.reservation_platform ?? undefined,
    reservationUrl: row.reservation_url ?? undefined,
  };
  return hasLocationData(legacy) ? [legacy] : [];
}

/** Convert a database row into the app's camelCase Restaurant. */
export function rowToRestaurant(row: RestaurantRow): Restaurant {
  const locations = locationsFromRow(row);
  const primary = locations[0];
  return {
    id: row.id,
    listId: row.list_id ?? undefined,
    addedBy: row.added_by ?? undefined,
    name: row.name,
    image: row.image ?? undefined,
    url: row.url ?? undefined,
    socialMedia: row.social_media ?? undefined,
    rating: row.rating ?? undefined,
    priceRange: row.price_range ?? undefined,
    comment: row.comment ?? undefined,
    cuisineType: row.cuisine_type ?? undefined,
    dietaryTags: row.dietary_tags ?? undefined,
    placeTypes: row.place_types ?? undefined,
    menuTypes: row.menu_types ?? undefined,
    michelinStars: row.michelin_stars ?? undefined,
    bibGourmand: row.bib_gourmand ?? undefined,
    status: row.status ?? 'want',
    locations,
    // Deprecated mirrors of the primary location for any older read path.
    reservationPlatform: primary?.reservationPlatform ?? undefined,
    reservationUrl: primary?.reservationUrl ?? undefined,
    email: primary?.email ?? undefined,
    phone: primary?.phone ?? undefined,
    address: primary?.address ?? undefined,
    lat: primary?.lat ?? undefined,
    lng: primary?.lng ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Strip undefined fields so the stored JSON stays compact. */
function cleanLocation(loc: RestaurantLocation): RestaurantLocation {
  const out: RestaurantLocation = {};
  if (loc.label) out.label = loc.label;
  if (loc.address) out.address = loc.address;
  if (loc.lat != null) out.lat = loc.lat;
  if (loc.lng != null) out.lng = loc.lng;
  if (loc.phone) out.phone = loc.phone;
  if (loc.email) out.email = loc.email;
  if (loc.reservationPlatform) out.reservationPlatform = loc.reservationPlatform;
  if (loc.reservationUrl) out.reservationUrl = loc.reservationUrl;
  return out;
}

/**
 * Convert app data into a row payload for insert/update. `created_at` /
 * `updated_at` are managed by the database. `list_id` and `added_by` are set
 * explicitly so the rows satisfy the row-level-security checks.
 *
 * `locations` is the source of truth; the legacy scalar columns are written from
 * locations[0] so they (and the map's fallback) stay in sync.
 */
export function restaurantToRow(
  data: Partial<Restaurant>,
  listId: string,
  addedBy: string
): Omit<RestaurantRow, 'id' | 'created_at' | 'updated_at'> {
  const rawLocations = (data.locations ?? []).filter(hasLocationData).map(cleanLocation);
  const primary = rawLocations[0] ?? {};
  return {
    list_id: listId,
    added_by: addedBy,
    name: data.name ?? '',
    image: data.image ?? null,
    url: data.url ?? null,
    social_media: data.socialMedia ?? {},
    rating: data.rating ?? null,
    price_range: data.priceRange ?? null,
    comment: data.comment ?? null,
    cuisine_type: data.cuisineType ?? null,
    dietary_tags: data.dietaryTags ?? [],
    place_types: data.placeTypes ?? [],
    menu_types: data.menuTypes ?? [],
    michelin_stars: data.michelinStars ?? 0,
    bib_gourmand: data.bibGourmand ?? false,
    status: data.status ?? 'want',
    locations: rawLocations,
    // Mirror the primary location into the legacy scalar columns.
    reservation_platform: primary.reservationPlatform ?? null,
    reservation_url: primary.reservationUrl ?? null,
    email: primary.email ?? null,
    phone: primary.phone ?? null,
    address: primary.address ?? null,
    latitude: primary.lat ?? null,
    longitude: primary.lng ?? null,
  };
}
