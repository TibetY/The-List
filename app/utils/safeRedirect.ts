/**
 * Validate a user-supplied redirect target so it can only point to a path on
 * this site (prevents open-redirect attacks). Returns `fallback` otherwise.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!to || typeof to !== 'string') return fallback;
  if (!to.startsWith('/') || to.startsWith('//') || to.startsWith('/\\')) {
    return fallback;
  }
  return to;
}
