import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import { getServerSupabaseEnv } from '~/supabaseConfig';

/**
 * Create a request-scoped Supabase client for use inside Remix loaders and
 * actions. It reads the auth session from the incoming request cookies and
 * collects any updated auth cookies (e.g. refreshed tokens) in `headers`,
 * which the caller must return on the Response so the browser stays in sync.
 *
 *   const { supabase, headers } = createSupabaseServerClient(request);
 *   ...
 *   return json(data, { headers });
 */
export function createSupabaseServerClient(request: Request) {
  const headers = new Headers();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getServerSupabaseEnv();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map(
          (cookie) => ({ name: cookie.name, value: cookie.value ?? '' })
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            'Set-Cookie',
            serializeCookieHeader(name, value, options)
          );
        });
      },
    },
  });

  return { supabase, headers };
}
