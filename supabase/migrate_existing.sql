-- ============================================================
-- One-time backfill for users/data created before schema.sql.
-- Run AFTER schema.sql, once. Safe to re-run (idempotent).
-- ============================================================

-- 1. Ensure every auth user has a profile.
insert into public.profiles (id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 2. Ensure every user has a default list + owner membership.
with missing as (
  select u.id as user_id
  from auth.users u
  where not exists (
    select 1 from public.lists l
    where l.owner_id = u.id and l.is_default
  )
), created as (
  insert into public.lists (owner_id, name, is_default)
  select user_id, 'My List', true from missing
  returning id as list_id, owner_id
)
insert into public.list_members (list_id, user_id, role)
select list_id, owner_id, 'owner' from created
on conflict (list_id, user_id) do nothing;

-- 3. Attach any orphaned restaurants to their owner's default list.
update public.restaurants r
set list_id = l.id
from public.lists l
where r.list_id is null
  and l.is_default
  and l.owner_id = coalesce(r.added_by, r.user_id);
