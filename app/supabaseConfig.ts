/**
 * Supabase project configuration.
 *
 * Both of these values are *public* (the anon key is safe to ship to the
 * browser — row-level security in the database is what protects your data),
 * so hardcoding them here mirrors how the old Firebase config worked.
 *
 * 👉 Paste your anon/public key below. Find it in the Supabase dashboard under
 *    Project Settings → API → "Project API keys" → `anon` `public`.
 *    (Do NOT use the `service_role` key here — that one is secret.)
 *
 * You can also override either value with the SUPABASE_URL / SUPABASE_ANON_KEY
 * environment variables.
 */
export const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env.SUPABASE_URL) ||
  'https://lgldchystppntwuqkdnv.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY) ||
  'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';

export const RESTAURANT_IMAGE_BUCKET = 'restaurant-images';
