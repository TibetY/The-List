import { describe, it, expect } from 'vitest';
import { parsePlaceCandidates } from '~/routes/api.search-place/route';

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
    const out = parsePlaceCandidates([restaurantRow, roadRow, barRow]);
    expect(out.map((c) => c.name)).toEqual(['The Whalesbone', 'Union Local']);
    const bar = out[1];
    expect(bar.placeTypes).toEqual(['Bar']);
    expect(bar.cuisineType).toBeNull();
    expect(bar.website).toBeNull();
  });
});
