import { describe, it, expect } from 'vitest';
import {
  parsePlaceCandidates,
  parsePhotonCandidates,
  parseBias,
  withDistances,
} from '~/routes/api.search-place/route';
import type { PlaceCandidate } from '~/types/restaurant';

// Representative jsonv2 rows from Nominatim (trimmed to the fields we read).
const restaurantRow = {
  lat: '45.4112',
  lon: '-75.6981',
  category: 'amenity',
  type: 'restaurant',
  display_name: 'The Whalesbone, 430, Bank Street, Ottawa, ON, K2P 1Y8, Canada',
  namedetails: { name: 'The Whalesbone' },
  extratags: { cuisine: 'seafood', website: 'thewhalesbone.com' },
};

const barRow = {
  lat: '45.42',
  lon: '-75.70',
  category: 'amenity',
  type: 'bar',
  display_name: 'Union Local, 315, Somerset Street West, Ottawa, Canada',
  namedetails: { name: 'Union Local' },
  extratags: {},
};

// A non-food result (road) that must be filtered out.
const roadRow = {
  lat: '45.4',
  lon: '-75.6',
  category: 'highway',
  type: 'residential',
  display_name: 'Bank Street, Ottawa, Canada',
};

// A convenience store carrying a cuisine tag — the cuisine-tag leniency must
// not let non-amenity categories through.
const shopRow = {
  lat: '45.41',
  lon: '-75.61',
  category: 'shop',
  type: 'convenience',
  display_name: 'Quickie Mart, 100, Bank Street, Ottawa, Canada',
  namedetails: { name: 'Quickie Mart' },
  extratags: { cuisine: 'pizza' },
};

describe('parsePlaceCandidates', () => {
  it('returns [] for non-array input', () => {
    expect(parsePlaceCandidates(null)).toEqual([]);
    expect(parsePlaceCandidates(undefined)).toEqual([]);
    expect(parsePlaceCandidates({} as unknown)).toEqual([]);
  });

  it('maps a food venue to a candidate and normalizes fields', () => {
    const [c, ...rest] = parsePlaceCandidates([restaurantRow]);
    expect(rest).toHaveLength(0);
    expect(c.name).toBe('The Whalesbone');
    // Leading name segment stripped from the display address
    expect(c.address.startsWith('430')).toBe(true);
    expect(c.lat).toBeCloseTo(45.4112);
    expect(c.lng).toBeCloseTo(-75.6981);
    expect(c.cuisineType).toBe('Seafood'); // mapped to our cuisineTypes casing
    expect(c.placeTypes).toEqual(['Restaurant']);
    // Scheme-less OSM website normalized to https
    expect(c.website).toBe('https://thewhalesbone.com');
  });

  it('keeps food/drink venues and drops non-food results', () => {
    const out = parsePlaceCandidates([restaurantRow, roadRow, shopRow, barRow]);
    expect(out.map((c) => c.name)).toEqual(['The Whalesbone', 'Union Local']);
    const bar = out[1];
    expect(bar.placeTypes).toEqual(['Bar']);
    expect(bar.cuisineType).toBeNull();
    expect(bar.website).toBeNull();
  });
});

describe('parsePhotonCandidates', () => {
  const photon = {
    features: [
      {
        geometry: { coordinates: [-122.4194, 37.7749] },
        properties: {
          name: 'Zuni Café',
          osm_key: 'amenity',
          osm_value: 'restaurant',
          housenumber: '1658',
          street: 'Market Street',
          city: 'San Francisco',
          state: 'California',
          country: 'United States',
        },
      },
      // duplicate (same name + city) — must be deduped
      {
        geometry: { coordinates: [-122.42, 37.775] },
        properties: { name: 'Zuni Café', osm_key: 'amenity', osm_value: 'restaurant', city: 'San Francisco' },
      },
      // non-food (a street named after a café) — must be dropped
      {
        geometry: { coordinates: [2.35, 48.85] },
        properties: { name: 'Rue du Café', osm_key: 'highway', osm_value: 'residential', city: 'Paris' },
      },
      {
        geometry: { coordinates: [2.37, 48.86] },
        properties: { name: 'Du Pain et des Idées', osm_key: 'shop', osm_value: 'bakery', city: 'Paris', country: 'France' },
      },
    ],
  };

  it('returns [] for malformed input', () => {
    expect(parsePhotonCandidates(null)).toEqual([]);
    expect(parsePhotonCandidates({})).toEqual([]);
  });

  it('maps, filters, and dedupes Photon features', () => {
    const out = parsePhotonCandidates(photon);
    expect(out.map((c) => c.name)).toEqual(['Zuni Café', 'Du Pain et des Idées']);
    const [zuni, bakery] = out;
    expect(zuni.address).toBe('1658 Market Street, San Francisco, California, United States');
    expect(zuni.lat).toBeCloseTo(37.7749);
    expect(zuni.lng).toBeCloseTo(-122.4194);
    expect(zuni.placeTypes).toEqual(['Restaurant']);
    expect(bakery.placeTypes).toEqual(['Bakery']);
  });
});

describe('parseBias', () => {
  it('returns undefined when lat/lng are missing or malformed', () => {
    expect(parseBias(new URLSearchParams())).toBeUndefined();
    expect(parseBias(new URLSearchParams('lat=45.4'))).toBeUndefined();
    expect(parseBias(new URLSearchParams('lat=abc&lng=-75.7'))).toBeUndefined();
  });

  it('parses valid lat/lng into a Bias', () => {
    expect(parseBias(new URLSearchParams('lat=45.4&lng=-75.7'))).toEqual({
      lat: 45.4,
      lng: -75.7,
    });
  });
});

describe('withDistances', () => {
  const candidate: PlaceCandidate = {
    name: 'Union Local',
    address: '315 Somerset Street West, Ottawa, Canada',
    lat: 45.42,
    lng: -75.7,
    cuisineType: null,
    placeTypes: ['Bar'],
    website: null,
  };

  it('passes candidates through unchanged when there is no bias', () => {
    expect(withDistances([candidate], undefined)).toEqual([candidate]);
  });

  it('attaches distanceM to candidates that have coordinates', () => {
    const [out] = withDistances([candidate], { lat: 45.4112, lng: -75.6981 });
    expect(out.distanceM).toBeGreaterThan(0);
    expect(out.distanceM).toBeLessThan(2000); // ~1.3km apart, sanity bound
  });

  it('leaves candidates without coordinates untouched', () => {
    const noCoords: PlaceCandidate = { ...candidate, lat: null, lng: null };
    const [out] = withDistances([noCoords], { lat: 45.4112, lng: -75.6981 });
    expect(out.distanceM).toBeUndefined();
  });
});
