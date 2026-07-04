import { describe, it, expect } from 'vitest';
import { parseOverpassNearby } from '~/routes/api.nearby-place/route';

// User at downtown SF-ish coords.
const USER = { lat: 37.7749, lng: -122.4194 };

const overpass = {
  elements: [
    {
      lat: 37.7752,
      lon: -122.419,
      tags: {
        name: 'Corner Café',
        amenity: 'cafe',
        cuisine: 'coffee_shop',
        'addr:housenumber': '100',
        'addr:street': 'Market St',
        'addr:city': 'San Francisco',
        website: 'cornercafe.com',
      },
    },
    {
      lat: 37.79,
      lon: -122.40,
      tags: { name: 'Far Osteria', amenity: 'restaurant', cuisine: 'italian' },
    },
    // no name → dropped
    { lat: 37.7749, lon: -122.4194, tags: { amenity: 'bar' } },
  ],
};

describe('parseOverpassNearby', () => {
  it('returns [] for non-object / missing elements', () => {
    expect(parseOverpassNearby(null, USER.lat, USER.lng)).toEqual([]);
    expect(parseOverpassNearby({}, USER.lat, USER.lng)).toEqual([]);
  });

  it('maps venues, sorts nearest-first, and computes distance', () => {
    const out = parseOverpassNearby(overpass, USER.lat, USER.lng);
    expect(out.map((c) => c.name)).toEqual(['Corner Café', 'Far Osteria']); // nameless dropped
    const [near, far] = out;
    // "Cafe" is a place type, not one of our cuisines, so cuisine stays null…
    expect(near.cuisineType).toBeNull();
    // …but the amenity maps to the Cafe place type.
    expect(near.placeTypes).toEqual(['Cafe']);
    expect(near.website).toBe('https://cornercafe.com');
    expect(near.address).toBe('100 Market St, San Francisco');
    expect(near.distanceM).toBeGreaterThanOrEqual(0);
    expect(near.distanceM).toBeLessThan(far.distanceM as number); // nearest first
    expect(far.cuisineType).toBe('Italian');
  });
});
