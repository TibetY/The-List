import type { SupabaseClient } from '@supabase/supabase-js';
import type { Restaurant } from '~/types/restaurant';
import { rowToRestaurant, type RestaurantRow } from './restaurantMap';

export interface SharedList {
  list: { id: string; name: string; description?: string };
  ownerName?: string;
  restaurants: Restaurant[];
}

/** Raw shape returned by the get_shared_list RPC. */
interface SharedListPayload {
  list: { id: string; name: string; description: string | null };
  owner: { displayName: string | null } | null;
  restaurants: RestaurantRow[] | null;
}

/**
 * Read a public shared list by token via the SECURITY DEFINER RPC (works for
 * anonymous visitors — RLS on lists/restaurants stays closed). Returns null when
 * the token is missing, revoked, or expired.
 */
export async function getSharedList(
  supabase: SupabaseClient,
  token: string
): Promise<SharedList | null> {
  const { data, error } = await supabase.rpc('get_shared_list', { _token: token });
  if (error) throw error;
  if (!data) return null;

  const payload = data as SharedListPayload;
  return {
    list: {
      id: payload.list.id,
      name: payload.list.name,
      description: payload.list.description ?? undefined,
    },
    ownerName: payload.owner?.displayName ?? undefined,
    restaurants: (payload.restaurants ?? []).map(rowToRestaurant),
  };
}

/**
 * Copy a shared list into a new list owned by the signed-in caller (every entry
 * reset to "want to try" with 0 visits, server-side). Returns the new list id.
 */
export async function forkSharedList(
  supabase: SupabaseClient,
  token: string
): Promise<string> {
  const { data, error } = await supabase.rpc('fork_shared_list', { _token: token });
  if (error) throw error;
  return data as string;
}
