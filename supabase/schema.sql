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

-- list_invite_links: shareable join links for a list (token-based)
create table if not exists public.list_invite_links (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null default replace(gen_random_uuid()::text, '-', ''),
  list_id    uuid not null references public.lists(id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor','viewer')),
  created_by uuid references auth.users(id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists list_invite_links_list_id_idx on public.list_invite_links (list_id);

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
-- Legacy user_id is no longer written by the app (added_by replaces it). On
-- tables created by an older schema it may still be NOT NULL, which breaks every
-- insert — relax it. (No-op if it's already nullable.)
alter table public.restaurants
  alter column user_id drop not null;
-- Location for the map view: a human-entered address, geocoded to coordinates.
alter table public.restaurants
  add column if not exists address text;
alter table public.restaurants
  add column if not exists latitude double precision;
alter table public.restaurants
  add column if not exists longitude double precision;
-- Reservation link, auto-detected from the restaurant's website (Resy/OpenTable)
-- or set manually; platform is a free-form label, not constrained, since users
-- can type any platform name when overriding.
alter table public.restaurants
  add column if not exists reservation_platform text;
alter table public.restaurants
  add column if not exists reservation_url text;
-- Dietary tags and place types are open-ended multi-select facets; stored as
-- text[] rather than an enum/junction table since the set is small and only
-- ever read/written whole, never queried column-by-column.
alter table public.restaurants
  add column if not exists dietary_tags text[] not null default '{}'::text[];
alter table public.restaurants
  add column if not exists place_types text[] not null default '{}'::text[];
-- Recognition badges: Michelin stars are a 0-3 tier, Bib Gourmand is separate
-- (a restaurant can hold one without the other).
alter table public.restaurants
  add column if not exists michelin_stars smallint not null default 0
    check (michelin_stars between 0 and 3);
alter table public.restaurants
  add column if not exists bib_gourmand boolean not null default false;
-- Carry any legacy owner value into added_by, then retire user_id usage.
update public.restaurants set added_by = user_id where added_by is null;

create index if not exists restaurants_list_id_idx    on public.restaurants (list_id);
create index if not exists restaurants_created_at_idx on public.restaurants (created_at desc);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER → bypass RLS, prevent policy recursion)
-- These live in a `private` schema that is NOT exposed by PostgREST, so they
-- cannot be called as RPCs over the API, but RLS policies can still use them.
-- ============================================================

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_list_member(_list_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.list_members
    where list_id = _list_id and user_id = auth.uid()
  );
$$;

create or replace function private.can_edit_list(_list_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.list_members
    where list_id = _list_id and user_id = auth.uid()
      and role in ('owner','editor')
  );
$$;

create or replace function private.list_role(_list_id uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from public.list_members
  where list_id = _list_id and user_id = auth.uid();
$$;

-- RLS runs these as whatever role issues the query, so both need EXECUTE.
grant execute on function
  private.is_list_member(uuid),
  private.can_edit_list(uuid),
  private.list_role(uuid)
  to anon, authenticated;

-- ============================================================
-- updated_at maintenance
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
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
-- Invite link RPC
-- ============================================================

-- Redeem a shareable invite link: add the caller to the list with the link's
-- role. Existing members keep their current role. Returns the list id.
create or replace function public.redeem_invite_link(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare lnk public.list_invite_links;
begin
  select * into lnk from public.list_invite_links
    where token = _token and active;
  if lnk.id is null then
    raise exception 'Invalid or inactive invite link';
  end if;

  insert into public.list_members (list_id, user_id, role)
  values (lnk.list_id, auth.uid(), lnk.role)
  on conflict (list_id, user_id) do nothing;

  return lnk.list_id;
end; $$;

-- ============================================================
-- Self-heal: ensure the caller has a default list
-- ============================================================

-- Accounts created before on_auth_user_created existed have no profile / list /
-- membership. This idempotent RPC bootstraps them on demand (called from the
-- dashboard loader when the user has no lists), so existing accounts recover
-- without re-signing-up. Returns the caller's (existing or new) default list id.
create or replace function public.ensure_default_list()
returns uuid language plpgsql security definer set search_path = public as $$
declare existing uuid; new_list_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (auth.uid(), split_part(coalesce(auth.jwt()->>'email', ''), '@', 1))
  on conflict (id) do nothing;

  select list_id into existing from public.list_members
    where user_id = auth.uid() limit 1;
  if existing is not null then return existing; end if;

  insert into public.lists (owner_id, name, is_default)
  values (auth.uid(), 'My List', true)
  returning id into new_list_id;   -- on_list_created adds the owner membership
  return new_list_id;
end; $$;

-- Only signed-in users can self-heal (anon has no auth.uid()).
revoke execute on function public.ensure_default_list() from anon;
grant  execute on function public.ensure_default_list() to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.lists              enable row level security;
alter table public.list_members       enable row level security;
alter table public.list_invite_links  enable row level security;
alter table public.restaurants        enable row level security;

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
  for select using (private.is_list_member(id) or owner_id = auth.uid());
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
  for select using (private.is_list_member(list_id));
create policy "owner adds members" on public.list_members
  for insert with check (private.list_role(list_id) = 'owner');
create policy "owner updates members" on public.list_members
  for update using (private.list_role(list_id) = 'owner');
create policy "owner removes or self leaves" on public.list_members
  for delete using (private.list_role(list_id) = 'owner' or user_id = auth.uid());

-- list_invite_links: only the list owner can see / manage join links.
-- (Redemption happens via the redeem_invite_link RPC, which is SECURITY DEFINER
--  and therefore does not require a SELECT policy for the joining user.)
drop policy if exists "owner reads links" on public.list_invite_links;
drop policy if exists "owner creates links" on public.list_invite_links;
drop policy if exists "owner updates links" on public.list_invite_links;
drop policy if exists "owner deletes links" on public.list_invite_links;
create policy "owner reads links" on public.list_invite_links
  for select using (private.list_role(list_id) = 'owner');
create policy "owner creates links" on public.list_invite_links
  for insert with check (private.list_role(list_id) = 'owner');
create policy "owner updates links" on public.list_invite_links
  for update using (private.list_role(list_id) = 'owner');
create policy "owner deletes links" on public.list_invite_links
  for delete using (private.list_role(list_id) = 'owner');

-- restaurants: members read; editors/owners write; rows are scoped to a list
drop policy if exists "read list restaurants" on public.restaurants;
drop policy if exists "editors add restaurants" on public.restaurants;
drop policy if exists "editors update restaurants" on public.restaurants;
drop policy if exists "editors delete restaurants" on public.restaurants;
create policy "read list restaurants" on public.restaurants
  for select using (private.is_list_member(list_id));
create policy "editors add restaurants" on public.restaurants
  for insert with check (private.can_edit_list(list_id) and added_by = auth.uid());
create policy "editors update restaurants" on public.restaurants
  for update using (private.can_edit_list(list_id));
create policy "editors delete restaurants" on public.restaurants
  for delete using (private.can_edit_list(list_id));

-- ============================================================
-- STORAGE BUCKETS + POLICIES
-- ============================================================
-- Both buckets are PUBLIC: objects are served via their public URL
-- (storage/v1/object/public/...) without consulting storage.objects RLS, and
-- the app only ever uses getPublicUrl()/upload(). We therefore do NOT add a
-- broad SELECT policy on storage.objects — that would let clients enumerate
-- every file via the list API. Only write policies (scoped to the user's own
-- <uid>/ folder) are needed.

insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Drop any broad public-read SELECT policies (incl. legacy names) so buckets
-- can't be listed. Public object URLs keep working without them.
drop policy if exists "public read restaurant images" on storage.objects;
drop policy if exists "public read images" on storage.objects;
drop policy if exists "public read avatars" on storage.objects;

drop policy if exists "upload own restaurant images" on storage.objects;
drop policy if exists "update own restaurant images" on storage.objects;
drop policy if exists "delete own restaurant images" on storage.objects;
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

drop policy if exists "upload own avatar" on storage.objects;
drop policy if exists "update own avatar" on storage.objects;
drop policy if exists "delete own avatar" on storage.objects;
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

-- ============================================================
-- HARDENING (security linter)
-- ============================================================

-- Remove the obsolete email-invite table (replaced by list_invite_links).
-- CASCADE also drops its leftover RLS policies, which still reference the old
-- public.list_role(uuid) helper and would otherwise block dropping it below.
drop table if exists public.list_invites cascade;

-- Remove obsolete email-invite RPCs (replaced by invite links).
drop function if exists public.accept_invite(uuid);
drop function if exists public.decline_invite(uuid);
drop function if exists public.my_pending_invites();

-- Remove the old public copies of the RLS helpers now that policies reference
-- the private schema. (CASCADE clears any remaining legacy policies that still
-- depend on these public versions; the live policies were already recreated
-- above to use the private.* helpers, so this is safe.)
drop function if exists public.is_list_member(uuid) cascade;
drop function if exists public.can_edit_list(uuid) cascade;
drop function if exists public.list_role(uuid) cascade;

-- Trigger functions must never be callable as RPCs. Revoking EXECUTE does not
-- affect triggers (the trigger system runs them regardless of grants).
revoke execute on function public.handle_new_user()  from anon, authenticated;
revoke execute on function public.handle_new_list()  from anon, authenticated;
revoke execute on function public.set_updated_at()   from anon, authenticated;

-- redeem_invite_link is a genuine RPC, but only signed-in users can join
-- (anon has no auth.uid()), so keep it off the anon role.
revoke execute on function public.redeem_invite_link(text) from anon;
grant  execute on function public.redeem_invite_link(text) to authenticated;

-- Defensive: if an rls_auto_enable() helper exists from an earlier setup,
-- take it off the public API roles too (no-op if it isn't present).
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end $$;
