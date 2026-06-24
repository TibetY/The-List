-- ============================================================
-- The List — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Auth users live in the managed `auth.users` table — nothing to create there.
-- ============================================================

-- 1. restaurants table ---------------------------------------
create table if not exists public.restaurants (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  image        text,                                  -- public storage URL
  url          text,                                  -- website
  social_media jsonb not null default '{}'::jsonb,    -- {facebook,instagram,twitter,tiktok}
  rating       smallint check (rating between 0 and 5),
  price_range  text,                                  -- '$' .. '$$$$'
  comment      text,
  cuisine_type text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists restaurants_user_id_idx    on public.restaurants (user_id);
create index if not exists restaurants_created_at_idx on public.restaurants (created_at desc);

-- 2. auto-maintain updated_at --------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- 3. Row Level Security: each user sees only their own rows ---
alter table public.restaurants enable row level security;

drop policy if exists "select own restaurants" on public.restaurants;
drop policy if exists "insert own restaurants" on public.restaurants;
drop policy if exists "update own restaurants" on public.restaurants;
drop policy if exists "delete own restaurants" on public.restaurants;

create policy "select own restaurants" on public.restaurants
  for select using (auth.uid() = user_id);
create policy "insert own restaurants" on public.restaurants
  for insert with check (auth.uid() = user_id);
create policy "update own restaurants" on public.restaurants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own restaurants" on public.restaurants
  for delete using (auth.uid() = user_id);

-- 4. Storage bucket for restaurant images --------------------
insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
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
