import type { ListRole, RestaurantList } from '~/types/restaurant';
import { getSupabaseBrowserClient } from '~/supabase.client';

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

/** Invite someone to a list by email (owner only). */
export async function inviteMember(
  listId: string,
  email: string,
  role: Exclude<ListRole, 'owner'>,
  invitedBy: string
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('list_invites').insert({
    list_id: listId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: invitedBy,
    status: 'pending',
  });
  if (error) throw error;
}

/** Revoke a pending invite (owner only). */
export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from('list_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId);
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

/** Accept an invite addressed to the current user (via RPC). */
export async function acceptInvite(inviteId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('accept_invite', { _invite_id: inviteId });
  if (error) throw error;
}

/** Decline an invite addressed to the current user (via RPC). */
export async function declineInvite(inviteId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc('decline_invite', {
    _invite_id: inviteId,
  });
  if (error) throw error;
}
