import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ListInvite,
  ListMember,
  RestaurantList,
} from '~/types/restaurant';
import {
  rowToInvite,
  rowToProfile,
  type PendingInviteRow,
  type ProfileRow,
} from './listMap';

interface MembershipRow {
  list_id: string;
  role: RestaurantList['role'];
  lists: {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    created_at: string | null;
  } | null;
}

/** All lists the current user belongs to, with their role + member count. */
export async function getLists(
  supabase: SupabaseClient,
  userId: string
): Promise<RestaurantList[]> {
  const { data, error } = await supabase
    .from('list_members')
    .select('list_id, role, lists(*)')
    .eq('user_id', userId);

  if (error) throw error;

  const rows = (data as unknown as MembershipRow[]).filter((r) => r.lists);
  const listIds = rows.map((r) => r.list_id);

  // Member counts for all of those lists in one query.
  const counts = new Map<string, number>();
  if (listIds.length > 0) {
    const { data: memberRows } = await supabase
      .from('list_members')
      .select('list_id')
      .in('list_id', listIds);
    (memberRows ?? []).forEach((m: { list_id: string }) => {
      counts.set(m.list_id, (counts.get(m.list_id) ?? 0) + 1);
    });
  }

  return rows
    .map((r) => ({
      id: r.lists!.id,
      ownerId: r.lists!.owner_id,
      name: r.lists!.name,
      description: r.lists!.description ?? undefined,
      isDefault: r.lists!.is_default,
      role: r.role,
      memberCount: counts.get(r.list_id) ?? 1,
      createdAt: r.lists!.created_at ? new Date(r.lists!.created_at) : undefined,
    }))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** Members of a list, with their profiles. */
export async function getListMembers(
  supabase: SupabaseClient,
  listId: string
): Promise<ListMember[]> {
  const { data, error } = await supabase
    .from('list_members')
    .select('*')
    .eq('list_id', listId);

  if (error) throw error;

  const members = data as {
    id: string;
    list_id: string;
    user_id: string;
    role: RestaurantList['role'];
  }[];

  const ids = members.map((m) => m.user_id);
  const profiles = new Map<string, ProfileRow>();
  if (ids.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);
    (profileRows as ProfileRow[] | null)?.forEach((p) =>
      profiles.set(p.id, p)
    );
  }

  const rolePriority: Record<RestaurantList['role'], number> = {
    owner: 0,
    editor: 1,
    viewer: 2,
  };

  return members
    .map((m) => ({
      id: m.id,
      listId: m.list_id,
      userId: m.user_id,
      role: m.role,
      profile: profiles.get(m.user_id)
        ? rowToProfile(profiles.get(m.user_id)!)
        : undefined,
    }))
    .sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
}

/** Pending invites for a list (owner-only by RLS). */
export async function getListInvites(
  supabase: SupabaseClient,
  listId: string
): Promise<ListInvite[]> {
  const { data, error } = await supabase
    .from('list_invites')
    .select('*')
    .eq('list_id', listId)
    .eq('status', 'pending');

  if (error) throw error;

  return (
    data as {
      id: string;
      list_id: string;
      email: string;
      role: ListInvite['role'];
      created_at: string | null;
    }[]
  ).map((i) => ({
    id: i.id,
    listId: i.list_id,
    email: i.email,
    role: i.role,
    status: 'pending' as const,
    createdAt: i.created_at ? new Date(i.created_at) : undefined,
  }));
}

/** Pending invites addressed to the current user (via RPC). */
export async function getPendingInvites(
  supabase: SupabaseClient
): Promise<ListInvite[]> {
  const { data, error } = await supabase.rpc('my_pending_invites');
  if (error) throw error;
  return (data as PendingInviteRow[]).map(rowToInvite);
}
