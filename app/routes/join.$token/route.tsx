import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { createSupabaseServerClient } from '~/supabase.server';

/**
 * Redeem a shareable invite link. If the visitor isn't signed in, send them to
 * log in (or sign up) and return here afterwards. Once authenticated, the
 * redeem_invite_link RPC adds them to the list and we land on it.
 */
export const loader: LoaderFunction = async ({ request, params }) => {
  const token = params.token ?? '';
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/join/${token}`);
    return redirect(`/login?next=${next}`, { headers });
  }

  try {
    const { data: listId, error } = await supabase.rpc('redeem_invite_link', {
      _token: token,
    });
    if (error) throw error;
    return redirect(`/dashboard?list=${listId}&join=ok`, { headers });
  } catch (error) {
    console.error('Error redeeming invite link:', error);
    return redirect('/dashboard?join=invalid', { headers });
  }
};

export default function JoinRoute() {
  return null;
}
