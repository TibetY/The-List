import type {
  ListInvite,
  ListMember,
  Profile,
  RestaurantList,
} from '~/types/restaurant';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export interface ListMemberRow {
  id: string;
  list_id: string;
  user_id: string;
  role: RestaurantList['role'];
  profiles?: ProfileRow | null;
}

export function rowToListMember(row: ListMemberRow): ListMember {
  return {
    id: row.id,
    listId: row.list_id,
    userId: row.user_id,
    role: row.role,
    profile: row.profiles ? rowToProfile(row.profiles) : undefined,
  };
}

/** Row returned by the my_pending_invites() RPC. */
export interface PendingInviteRow {
  id: string;
  list_id: string;
  list_name: string;
  role: ListInvite['role'];
  invited_by_name: string | null;
  created_at: string | null;
}

export function rowToInvite(row: PendingInviteRow): ListInvite {
  return {
    id: row.id,
    listId: row.list_id,
    listName: row.list_name,
    role: row.role,
    email: '',
    invitedByName: row.invited_by_name ?? undefined,
    status: 'pending',
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}
