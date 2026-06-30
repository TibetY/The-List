import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InviteLink,
  ListMember,
  RestaurantList,
  ShareLink,
} from '~/types/restaurant';
import {
  rowToInviteLink,
  rowToProfile,
  rowToShareLink,
  type InviteLinkRow,
  type ProfileRow,
  type ShareLinkRow,
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
      createdAt: r.lists!.created_at ?? undefined,
    }))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Ensure the current user has at least a default list (profile + "My List" +
 * owner membership). Idempotent; safe to call when the user already has lists.
 * Recovers accounts created before the new-user bootstrap trigger existed.
 */
export async function ensureDefaultList(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase.rpc('ensure_default_list');
  if (error) throw error;
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

/** The active shareable invite link for a list, if any (owner-only by RLS). */
export async function getInviteLink(
  supabase: SupabaseClient,
  listId: string
): Promise<InviteLink | null> {
  const { data, error } = await supabase
    .from('list_invite_links')
    .select('id, token, list_id, role, active')
    .eq('list_id', listId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToInviteLink(data as InviteLinkRow) : null;
}

/** The active public share link for a list, if any (owner-only by RLS). */
export async function getShareLink(
  supabase: SupabaseClient,
  listId: string
): Promise<ShareLink | null> {
  const { data, error } = await supabase
    .from('list_share_links')
    .select('id, token, list_id, expires_at, active')
    .eq('list_id', listId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToShareLink(data as ShareLinkRow) : null;
}
