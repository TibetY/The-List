-- ============================================================
-- The Foodiedex — schema verification (read-only)
-- Run AFTER schema.sql in the Supabase SQL Editor. Every row should report
-- status = 'OK'. Any 'MISSING' / 'WRONG' means re-run supabase/schema.sql.
-- ============================================================

-- 1. restaurants has the location + list/status/added_by + reservation +
--    dietary/type/recognition + contact columns
select
  'restaurants.columns' as check,
  case when count(*) = 14 then 'OK' else 'MISSING' end as status,
  string_agg(column_name, ', ' order by column_name) as found
from information_schema.columns
where table_schema = 'public'
  and table_name = 'restaurants'
  and column_name in (
    'address', 'latitude', 'longitude', 'status', 'added_by', 'list_id',
    'reservation_platform', 'reservation_url',
    'dietary_tags', 'place_types', 'michelin_stars', 'bib_gourmand',
    'email', 'phone'
  );

-- 2. legacy restaurants.user_id is nullable (NOT NULL would block inserts)
select
  'restaurants.user_id nullable' as check,
  case when is_nullable = 'YES' then 'OK' else 'WRONG' end as status,
  is_nullable as found
from information_schema.columns
where table_schema = 'public' and table_name = 'restaurants' and column_name = 'user_id';

-- 3. obsolete email-invite table is gone (replaced by list_invite_links)
select
  'list_invites removed' as check,
  case when count(*) = 0 then 'OK' else 'WRONG' end as status,
  count(*)::text as found
from information_schema.tables
where table_schema = 'public' and table_name = 'list_invites';

-- 4. the new tables all exist
select
  'core tables' as check,
  case when count(*) = 5 then 'OK' else 'MISSING' end as status,
  string_agg(table_name, ', ' order by table_name) as found
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'lists', 'list_members', 'list_invite_links', 'restaurants');

-- 5. RLS helper functions live in the private schema (no policy recursion)
select
  'private RLS helpers' as check,
  case when count(*) = 3 then 'OK' else 'MISSING' end as status,
  string_agg(p.proname, ', ' order by p.proname) as found
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in ('is_list_member', 'can_edit_list', 'list_role');

-- 6. account self-heal + invite-redeem RPCs exist
select
  'public RPCs' as check,
  case when count(*) = 2 then 'OK' else 'MISSING' end as status,
  string_agg(p.proname, ', ' order by p.proname) as found
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('ensure_default_list', 'redeem_invite_link');

-- 7. row-level security is enabled on every app table
select
  'RLS enabled' as check,
  case when count(*) = 5 then 'OK' else 'WRONG' end as status,
  string_agg(relname, ', ' order by relname) as found
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relrowsecurity = true
  and c.relname in ('profiles', 'lists', 'list_members', 'list_invite_links', 'restaurants');

-- 8. storage buckets exist
select
  'storage buckets' as check,
  case when count(*) = 2 then 'OK' else 'MISSING' end as status,
  string_agg(id, ', ' order by id) as found
from storage.buckets
where id in ('restaurant-images', 'avatars');
