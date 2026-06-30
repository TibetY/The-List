import type {
  InviteLink,
  ListRole,
  RestaurantList,
  ShareLink,
} from '~/types/restaurant';
import { getSupabaseBrowserClient } from '~/supabase.client';
import {
  rowToInviteLink,
  rowToShareLink,
  type InviteLinkRow,
  type ShareLinkRow,
} from './listMap';

/** Create a new list owned by the current user. Returns its id. */
export async function createList(
  name: string,
  ownerId: string,
  description?: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('lists')
    .insert({ name, description: description ?? null, owner_id: ownerId })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Rename / re-describe a list (owner only, enforced by RLS). */
export async function updateList(
  id: string,
  patch: Partial<Pick<RestaurantList, 'name' | 'description'>>
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('lists')
    .update({ name: patch.name, description: patch.description ?? null })
    .eq('id', id);
  if (error) throw error;
}

/** Delete a list and everything in it (owner only). */
export async function deleteList(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('lists').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Create a fresh shareable invite link for a list (owner only). Any previous
 * links are deactivated so only the newest link works.
 */
export async function createInviteLink(
  listId: string,
  role: Exclude<ListRole, 'owner'>,
  createdBy: string
): Promise<InviteLink> {
  const supabase = getSupabaseBrowserClient();

  await supabase
    .from('list_invite_links')
    .update({ active: false })
    .eq('list_id', listId)
    .eq('active', true);

  const { data, error } = await supabase
    .from('list_invite_links')
    .insert({ list_id: listId, role, created_by: createdBy })
    .select('id, token, list_id, role, active')
    .single();

  if (error) throw error;
  return rowToInviteLink(data as InviteLinkRow);
}

/** Deactivate a list's invite link (owner only). */
export async function revokeInviteLink(linkId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('list_invite_links')
    .update({ active: false })
    .eq('id', linkId);
  if (error) throw error;
}

/**
 * Change the role an existing invite link grants (owner only). Keeps the same
 * token/URL so any link already shared keeps working with the new role.
 */
export async function updateInviteLinkRole(
  linkId: string,
  role: Exclude<ListRole, 'owner'>
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('list_invite_links')
    .update({ role })
    .eq('id', linkId);
  if (error) throw error;
}

/**
 * Create a public read-only share link for a list (owner only). Any previous
 * link is deactivated so only the newest one works. `expiresAt` is an ISO
 * timestamp, or null for a link that never expires.
 */
export async function createShareLink(
  listId: string,
  expiresAt: string | null,
  createdBy: string
): Promise<ShareLink> {
  const supabase = getSupabaseBrowserClient();

  await supabase
    .from('list_share_links')
    .update({ active: false })
    .eq('list_id', listId)
    .eq('active', true);

  const { data, error } = await supabase
    .from('list_share_links')
    .insert({ list_id: listId, expires_at: expiresAt, created_by: createdBy })
    .select('id, token, list_id, expires_at, active')
    .single();

  if (error) throw error;
  return rowToShareLink(data as ShareLinkRow);
}

/** Deactivate a list's public share link (owner only). */
export async function revokeShareLink(linkId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('list_share_links')
    .update({ active: false })
    .eq('id', linkId);
  if (error) throw error;
}

/** Change a member's role (owner only). Cannot target the owner row. */
export async function updateMemberRole(
  memberId: string,
  role: Exclude<ListRole, 'owner'>
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('list_members')
    .update({ role })
    .eq('id', memberId);
  if (error) throw error;
}

/** Remove a member (owner) or leave a list yourself. */
export async function removeMember(memberId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('id', memberId);
  if (error) throw error;
}
