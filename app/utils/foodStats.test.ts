import { describe, it, expect } from 'vitest';
import { computeFoodStats, cityFromAddress } from '~/utils/foodStats';
import type { Restaurant } from '~/types/restaurant';

/** Minimal restaurant factory — only the fields a given test cares about. */
function make(overrides: Partial<Restaurant>): Restaurant {
  return { name: 'Test', ...overrides };
}

describe('computeFoodStats', () => {
  it('returns zeroed, empty stats for an empty list', () => {
    const s = computeFoodStats([]);
    expect(s.total).toBe(0);
    expect(s.beenCount).toBe(0);
    expect(s.wantCount).toBe(0);
    expect(s.averageRating).toBeNull();
    expect(s.cuisines).toEqual([]);
    expect(s.priceTiers).toEqual([]);
    expect(s.cities).toEqual([]);
    expect(s.topVisited).toEqual([]);
  });

  it('handles a single fully-specified restaurant', () => {
    const s = computeFoodStats([
      make({
        name: 'The Whalesbone',
        status: 'been',
        favorite: true,
        rating: 5,
        priceRange: '$$$',
        cuisineType: 'Seafood',
        michelinStars: 1,
        bibGourmand: true,
        visitCount: 3,
        locations: [{ address: '430 Bank St, Ottawa, ON' }],
      }),
    ]);
    expect(s.total).toBe(1);
    expect(s.beenCount).toBe(1);
    expect(s.wantCount).toBe(0);
    expect(s.favoriteCount).toBe(1);
    expect(s.ratedCount).toBe(1);
    expect(s.averageRating).toBe(5);
    expect(s.michelinStarredCount).toBe(1);
    expect(s.totalMichelinStars).toBe(1);
    expect(s.bibGourmandCount).toBe(1);
    expect(s.totalVisits).toBe(3);
    expect(s.cuisines).toEqual([{ label: 'Seafood', count: 1 }]);
    expect(s.priceTiers).toEqual([{ label: '$$$', count: 1 }]);
    expect(s.cities).toEqual([{ label: 'Ottawa', count: 1 }]);
    expect(s.topVisited).toEqual([{ name: 'The Whalesbone', visitCount: 3 }]);
  });

  it('aggregates a mixed, multi-location list', () => {
    const s = computeFoodStats(
      [
        make({
          name: 'Alpha',
          status: 'been',
          rating: 4,
          priceRange: '$$$$',
          cuisineType: 'Italian',
          visitCount: 2,
          locations: [
            { address: '1 King St, Toronto, ON' },
            { address: '9 Queen St, Toronto, ON' }, // same city → counted once
          ],
        }),
        make({
          name: 'Beta',
          status: 'want',
          rating: 0, // unrated → excluded from average
          priceRange: '$',
          cuisineType: 'Italian',
          visitCount: 0,
          locations: [{ address: '5 Rue Sainte-Catherine, Montreal, QC' }],
        }),
        make({
          name: 'Gamma',
          status: 'been',
          rating: 2,
          priceRange: '$$',
          cuisineType: 'Thai',
          visitCount: 5,
          locations: [{ address: '22 Bank St, Ottawa, ON' }],
        }),
      ],
      2 // topVisited limit
    );

    expect(s.total).toBe(3);
    expect(s.beenCount).toBe(2);
    expect(s.wantCount).toBe(1);
    expect(s.ratedCount).toBe(2);
    // (4 + 2) / 2 = 3.0
    expect(s.averageRating).toBe(3);
    expect(s.totalVisits).toBe(7);

    // Cuisines: Italian (2) before Thai (1)
    expect(s.cuisines).toEqual([
      { label: 'Italian', count: 2 },
      { label: 'Thai', count: 1 },
    ]);
    // Price tiers sorted cheapest → priciest by symbol count
    expect(s.priceTiers.map((p) => p.label)).toEqual(['$', '$$', '$$$$']);
    // Toronto counted once despite two branches; three distinct cities
    expect(s.cities).toEqual([
      { label: 'Montreal', count: 1 },
      { label: 'Ottawa', count: 1 },
      { label: 'Toronto', count: 1 },
    ]);
    // topVisited respects the limit and orders by visits desc
    expect(s.topVisited).toEqual([
      { name: 'Gamma', visitCount: 5 },
      { name: 'Alpha', visitCount: 2 },
    ]);
  });

  it('defaults a missing status to "want"', () => {
    const s = computeFoodStats([make({ name: 'NoStatus' })]);
    expect(s.wantCount).toBe(1);
    expect(s.beenCount).toBe(0);
  });
});

describe('cityFromAddress', () => {
  it('extracts the city from a typical street/city/region address', () => {
    expect(cityFromAddress('430 Bank St, Ottawa, ON')).toBe('Ottawa');
    expect(cityFromAddress('600 Guerrero St, San Francisco, CA')).toBe('San Francisco');
  });

  it('skips street, postal, region, and country segments', () => {
    expect(
      cityFromAddress('The Whalesbone, 430 Bank St, Ottawa, ON K2P 1Y8, Canada')
    ).toBe('Ottawa');
  });

  it('handles postal-prefixed city segments (European formats)', () => {
    expect(cityFromAddress('80 Rue de Charonne, 75011 Paris, France')).toBe('Paris');
  });

  it('handles Nominatim display_names with a leading house-number segment', () => {
    expect(
      cityFromAddress('1120, High Street, Auburn, Placer County, California, 95603, United States')
    ).toBe('Auburn');
  });

  it('returns null when it cannot reasonably tell', () => {
    expect(cityFromAddress('Ottawa')).toBeNull();
    expect(cityFromAddress('')).toBeNull();
    expect(cityFromAddress(undefined)).toBeNull();
  });
});
