import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '~/supabaseConfig';

let client: SupabaseClient | undefined;

/**
 * Browser Supabase client (singleton). Reads the auth session from cookies set
 * by the server, so authenticated reads/writes work and RLS policies apply.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
