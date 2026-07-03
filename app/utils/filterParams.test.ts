import { describe, it, expect } from 'vitest';
import { serializeFilterParams, applyViewParams } from '~/utils/filterParams';

describe('serializeFilterParams', () => {
  it('keeps only filter keys, in canonical order, dropping empties', () => {
    const input = new URLSearchParams('list=abc&sort=rating&status=been&cuisine=Italian&junk=1');
    // canonical order: status before sort; list/junk excluded
    expect(serializeFilterParams(input)).toBe('status=been&cuisine=Italian&sort=rating');
  });

  it('is order-independent for equal filter sets', () => {
    const a = serializeFilterParams(new URLSearchParams('cuisine=Thai&status=want'));
    const b = serializeFilterParams(new URLSearchParams('status=want&cuisine=Thai'));
    expect(a).toBe(b);
  });

  it('returns empty string when no filters are set', () => {
    expect(serializeFilterParams(new URLSearchParams('list=abc'))).toBe('');
  });
});

describe('applyViewParams', () => {
  it('swaps filter params while preserving non-filter keys like list', () => {
    const current = new URLSearchParams('list=abc&cuisine=Thai&rating=5');
    const next = applyViewParams(current, 'status=been&sort=rating');
    expect(next.get('list')).toBe('abc');
    expect(next.get('cuisine')).toBeNull(); // cleared — not in the view
    expect(next.get('rating')).toBeNull();
    expect(next.get('status')).toBe('been');
    expect(next.get('sort')).toBe('rating');
  });

  it('applying an empty view clears all filters but keeps list', () => {
    const current = new URLSearchParams('list=abc&status=been&cuisine=Thai');
    const next = applyViewParams(current, '');
    expect(next.toString()).toBe('list=abc');
  });
});
