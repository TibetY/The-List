import type {
  InviteLink,
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

export interface InviteLinkRow {
  id: string;
  token: string;
  list_id: string;
  role: InviteLink['role'];
  active: boolean;
}

export function rowToInviteLink(row: InviteLinkRow): InviteLink {
  return {
    id: row.id,
    token: row.token,
    listId: row.list_id,
    role: row.role,
    active: row.active,
  };
}
