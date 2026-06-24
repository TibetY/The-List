import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBrowserSupabaseEnv } from '~/supabaseConfig';

let client: SupabaseClient | undefined;

/**
 * Browser Supabase client (singleton). Reads the project URL + anon key from
 * window.ENV (injected by the root route) and the auth session from cookies set
 * by the server, so authenticated reads/writes work and RLS policies apply.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = getBrowserSupabaseEnv();
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
