/**
 * The searchParam keys that encode a dashboard filter/sort view. Kept in one
 * place so the dashboard, `clearFilters`, and saved views stay in sync. Order is
 * significant: it makes `serializeFilterParams` output canonical, so two views
 * with the same filters compare equal as strings.
 */
export const FILTER_PARAM_KEYS = [
  'q',
  'status',
  'cuisine',
  'cost',
  'rating',
  'place',
  'diet',
  'menu',
  'sort',
  'rev',
] as const;

/**
 * Canonical querystring of just the filter/sort params (non-empty only, in
 * FILTER_PARAM_KEYS order). This is what a saved view stores, and what "is the
 * current view active?" compares against.
 */
export function serializeFilterParams(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of FILTER_PARAM_KEYS) {
    const value = params.get(key);
    if (value) out.set(key, value);
  }
  return out.toString();
}

/**
 * Apply a stored view's params onto the current search params: drop every filter
 * key, then set the ones the view carries. Non-filter params (e.g. `list`) are
 * left untouched. Returns a new URLSearchParams.
 */
export function applyViewParams(
  current: URLSearchParams,
  viewParams: string
): URLSearchParams {
  const incoming = new URLSearchParams(viewParams);
  const next = new URLSearchParams(current);
  for (const key of FILTER_PARAM_KEYS) next.delete(key);
  for (const key of FILTER_PARAM_KEYS) {
    const value = incoming.get(key);
    if (value) next.set(key, value);
  }
  return next;
}
