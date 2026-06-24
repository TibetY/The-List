-- ============================================================
-- The List — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Safe to re-run: uses "if not exists" / "create or replace" / policy drops.
-- Auth users live in the managed `auth.users` table — nothing to create there.
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: public display info for each user (no email, to keep it private)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- lists: a collection of restaurants, owned by one user, shareable with others
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lists_owner_id_idx on public.lists (owner_id);

-- list_members: who can see/edit a list and at what role
create table if not exists public.list_members (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);
create index if not exists list_members_list_id_idx on public.list_members (list_id);
create index if not exists list_members_user_id_idx on public.list_members (user_id);

-- list_invites: pending email invitations to join a list
create table if not exists public.list_invites (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  email      text not null,
  role       text not null default 'viewer' check (role in ('editor','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  status     text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
create unique index if not exists list_invites_unique_pending
  on public.list_invites (list_id, lower(email))
  where status = 'pending';
create index if not exists list_invites_email_idx on public.list_invites (lower(email));

-- restaurants: the actual entries (now belong to a list)
create table if not exists public.restaurants (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,  -- legacy; see added_by
  name         text not null,
  image        text,
  url          text,
  social_media jsonb not null default '{}'::jsonb,
  rating       smallint check (rating between 0 and 5),
  price_range  text,
  comment      text,
  cuisine_type text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Upgrade restaurants for lists + status + added_by (idempotent).
alter table public.restaurants
  add column if not exists list_id uuid references public.lists(id) on delete cascade;
alter table public.restaurants
  add column if not exists status text not null default 'want'
    check (status in ('been','want'));
alter table public.restaurants
  add column if not exists added_by uuid references auth.users(id) on delete set null;
-- Carry any legacy owner value into added_by, then retire user_id usage.
update public.restaurants set added_by = user_id where added_by is null;

create index if not exists restaurants_list_id_idx    on public.restaurants (list_id);
create index if not exists restaurants_created_at_idx on public.restaurants (created_at desc);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER → bypass RLS, prevent policy recursion)
-- ============================================================

create or replace function public.is_list_member(_list_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.list_members
    where list_id = _list_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_list(_list_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.list_members
    where list_id = _list_id and user_id = auth.uid()
      and role in ('owner','editor')
  );
$$;

create or replace function public.list_role(_list_id uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from public.list_members
  where list_id = _list_id and user_id = auth.uid();
$$;

-- ============================================================
-- updated_at maintenance
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists lists_set_updated_at on public.lists;
create trigger lists_set_updated_at before update on public.lists
  for each row execute function public.set_updated_at();

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

-- ============================================================
-- New-user bootstrap: profile + default list + owner membership
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_list_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;

  insert into public.lists (owner_id, name, is_default)
  values (new.id, 'My List', true)
  returning id into new_list_id;

  insert into public.list_members (list_id, user_id, role)
  values (new_list_id, new.id, 'owner')
  on conflict (list_id, user_id) do nothing;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When a list is created, make its owner a member with the 'owner' role.
-- (Needed because the list_members insert policy requires existing ownership.)
create or replace function public.handle_new_list()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.list_members (list_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (list_id, user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_list_created on public.lists;
create trigger on_list_created
  after insert on public.lists
  for each row execute function public.handle_new_list();

-- ============================================================
-- Invite RPCs
-- ============================================================

-- Accept a pending invite addressed to the caller's email.
create or replace function public.accept_invite(_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare inv public.list_invites;
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  select * into inv from public.list_invites
    where id = _invite_id and status = 'pending';
  if inv.id is null then
    raise exception 'Invite not found or already handled';
  end if;
  if lower(inv.email) <> lower(my_email) then
    raise exception 'This invite is for a different email';
  end if;

  insert into public.list_members (list_id, user_id, role)
  values (inv.list_id, auth.uid(), inv.role)
  on conflict (list_id, user_id) do update set role = excluded.role;

  update public.list_invites set status = 'accepted' where id = inv.id;
end; $$;

-- Decline a pending invite addressed to the caller's email.
create or replace function public.decline_invite(_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  update public.list_invites
    set status = 'revoked'
    where id = _invite_id and status = 'pending'
      and lower(email) = lower(my_email);
end; $$;

-- Pending invites addressed to the caller, with list + inviter names.
create or replace function public.my_pending_invites()
returns table (
  id uuid,
  list_id uuid,
  list_name text,
  role text,
  invited_by_name text,
  created_at timestamptz
) language sql security definer stable set search_path = public as $$
  select i.id, i.list_id, l.name, i.role,
         coalesce(p.display_name, 'Someone'), i.created_at
  from public.list_invites i
  join public.lists l on l.id = i.list_id
  left join public.profiles p on p.id = i.invited_by
  where i.status = 'pending'
    and lower(i.email) = lower((select email from auth.users where id = auth.uid()));
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.lists         enable row level security;
alter table public.list_members  enable row level security;
alter table public.list_invites  enable row level security;
alter table public.restaurants   enable row level security;

-- profiles: any authenticated user can read display info; you edit only your own
drop policy if exists "read profiles" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "insert own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- lists: members can read; only the owner can create/modify/delete
drop policy if exists "read member lists" on public.lists;
drop policy if exists "insert own list" on public.lists;
drop policy if exists "update own list" on public.lists;
drop policy if exists "delete own list" on public.lists;
create policy "read member lists" on public.lists
  for select using (public.is_list_member(id) or owner_id = auth.uid());
create policy "insert own list" on public.lists
  for insert with check (owner_id = auth.uid());
create policy "update own list" on public.lists
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own list" on public.lists
  for delete using (owner_id = auth.uid());

-- list_members: members can see co-members; owner manages; anyone can leave
drop policy if exists "read co-members" on public.list_members;
drop policy if exists "owner adds members" on public.list_members;
drop policy if exists "owner updates members" on public.list_members;
drop policy if exists "owner removes or self leaves" on public.list_members;
create policy "read co-members" on public.list_members
  for select using (public.is_list_member(list_id));
create policy "owner adds members" on public.list_members
  for insert with check (public.list_role(list_id) = 'owner');
create policy "owner updates members" on public.list_members
  for update using (public.list_role(list_id) = 'owner');
create policy "owner removes or self leaves" on public.list_members
  for delete using (public.list_role(list_id) = 'owner' or user_id = auth.uid());

-- list_invites: list owner manages; invitee can see invites for their email
drop policy if exists "read invites" on public.list_invites;
drop policy if exists "owner creates invites" on public.list_invites;
drop policy if exists "owner updates invites" on public.list_invites;
drop policy if exists "owner deletes invites" on public.list_invites;
create policy "read invites" on public.list_invites
  for select using (
    public.list_role(list_id) = 'owner'
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "owner creates invites" on public.list_invites
  for insert with check (public.list_role(list_id) = 'owner');
create policy "owner updates invites" on public.list_invites
  for update using (public.list_role(list_id) = 'owner');
create policy "owner deletes invites" on public.list_invites
  for delete using (public.list_role(list_id) = 'owner');

-- restaurants: members read; editors/owners write; rows are scoped to a list
drop policy if exists "read list restaurants" on public.restaurants;
drop policy if exists "editors add restaurants" on public.restaurants;
drop policy if exists "editors update restaurants" on public.restaurants;
drop policy if exists "editors delete restaurants" on public.restaurants;
create policy "read list restaurants" on public.restaurants
  for select using (public.is_list_member(list_id));
create policy "editors add restaurants" on public.restaurants
  for insert with check (public.can_edit_list(list_id) and added_by = auth.uid());
create policy "editors update restaurants" on public.restaurants
  for update using (public.can_edit_list(list_id));
create policy "editors delete restaurants" on public.restaurants
  for delete using (public.can_edit_list(list_id));

-- ============================================================
-- STORAGE BUCKETS + POLICIES
-- ============================================================

insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "public read restaurant images" on storage.objects;
drop policy if exists "upload own restaurant images" on storage.objects;
drop policy if exists "update own restaurant images" on storage.objects;
drop policy if exists "delete own restaurant images" on storage.objects;
create policy "public read restaurant images" on storage.objects
  for select using (bucket_id = 'restaurant-images');
create policy "upload own restaurant images" on storage.objects
  for insert with check (
    bucket_id = 'restaurant-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "update own restaurant images" on storage.objects
  for update using (
    bucket_id = 'restaurant-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "delete own restaurant images" on storage.objects
  for delete using (
    bucket_id = 'restaurant-images'
    and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "public read avatars" on storage.objects;
drop policy if exists "upload own avatar" on storage.objects;
drop policy if exists "update own avatar" on storage.objects;
drop policy if exists "delete own avatar" on storage.objects;
create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]);
