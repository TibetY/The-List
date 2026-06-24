import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '~/supabase.server';
import { safeRedirect } from '~/utils/safeRedirect';

/**
 * Email-confirmation landing route. Supabase sends the user here from the
 * confirmation email. We verify the token server-side so the auth cookies are
 * set (SSR), then forward to `next`. Handles both the token_hash flow (email
 * template using {{ .TokenHash }}) and the PKCE code flow.
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');
  const next = safeRedirect(url.searchParams.get('next'));

  const { supabase, headers } = createSupabaseServerClient(request);

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return redirect(next, { headers });
    console.error('verifyOtp failed:', error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirect(next, { headers });
    console.error('exchangeCodeForSession failed:', error.message);
  }

  return redirect(
    '/login?error=' + encodeURIComponent('Email link is invalid or has expired'),
    { headers }
  );
};

export default function ConfirmRoute() {
  return null;
}
