/**
 * Supabase configuration is read from environment variables (set these in
 * Netlify → Site settings → Environment variables, and in a local `.env` for
 * development):
 *
 *   SUPABASE_URL        e.g. https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY   the project's anon / public key
 *
 * The anon key is public (row-level security protects the data), so it is safe
 * to ship to the browser. The server reads `process.env` directly; the browser
 * reads the values from `window.ENV`, which the root route injects from the
 * server-side env (see app/root.tsx).
 */
export const RESTAURANT_IMAGE_BUCKET = 'restaurant-images';

export interface PublicEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

declare global {
  interface Window {
    ENV?: PublicEnv;
  }
}

/** Read the public env on the server (loaders/actions). */
export function getServerSupabaseEnv(): PublicEnv {
  // Trim to guard against trailing newlines/spaces from copy-paste into the
  // host's env UI, which would otherwise corrupt the JWT ("Invalid API key").
  const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
  const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').trim();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_ANON_KEY environment variables.'
    );
  }
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

/** Read the public env in the browser (injected via window.ENV). */
export function getBrowserSupabaseEnv(): PublicEnv {
  const env = typeof window !== 'undefined' ? window.ENV : undefined;
  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase env not available on window.ENV. Is root.tsx injecting it?'
    );
  }
  return env;
}
