-- public.profile: one row per auth user (anchor for profile_follow FKs only).
-- Display text always comes from auth.users (raw_user_meta_data + email) via RPCs.

create table if not exists public.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_follow (
  follower_id uuid not null references public.profile (user_id) on delete cascade,
  following_id uuid not null references public.profile (user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint profile_follow_no_self check (follower_id <> following_id)
);

create index if not exists profile_follow_follower_idx on public.profile_follow (follower_id);
create index if not exists profile_follow_following_idx on public.profile_follow (following_id);

-- ---------------------------------------------------------------------------
-- Ensure profile row exists for each auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profile (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_auth_user_profile();

insert into public.profile (user_id)
select u.id
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Search: read auth.users only (SECURITY DEFINER). Returns display_name = live label.
-- ---------------------------------------------------------------------------
create or replace function public.search_profiles(
  p_search text,
  p_exclude_user_id uuid,
  p_max int default 20
)
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public, auth
as $$
  with cleaned as (
    select replace(replace(replace(trim(p_search), E'\\', ''), '%', ''), '_', '') as s
  ),
  labeled as (
    select
      u.id as uid,
      coalesce(
        nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
        nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
        nullif(trim(u.raw_user_meta_data->>'name'), ''),
        u.email::text,
        ''
      ) as label,
      u.email::text as email
    from auth.users u, cleaned c
    where u.id is distinct from p_exclude_user_id
      and length(c.s) >= 1
      and (
        coalesce(
          nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
          nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
          nullif(trim(u.raw_user_meta_data->>'name'), ''),
          u.email::text,
          ''
        ) ilike '%' || c.s || '%'
        or coalesce(u.email::text, '') ilike '%' || c.s || '%'
        or replace(u.id::text, '-', '') ilike '%' || replace(c.s, '-', '') || '%'
      )
  )
  select l.uid as user_id, l.label as display_name
  from labeled l
  cross join cleaned c
  order by
    case when lower(l.label) = lower(c.s) then 0 else 1 end,
    case when lower(coalesce(l.email, '')) = lower(c.s) then 0 else 1 end,
    length(l.label)
  limit least(coalesce(p_max, 20), 50);
$$;

revoke all on function public.search_profiles(text, uuid, int) from public;
grant execute on function public.search_profiles(text, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Batch labels for Friends lists (same coalesce as public_user_display_name)
-- ---------------------------------------------------------------------------
create or replace function public.public_user_display_names_for_ids(p_user_ids uuid[])
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      u.email::text,
      ''
    )::text
  from auth.users u
  where u.id = any(p_user_ids);
$$;

revoke all on function public.public_user_display_names_for_ids(uuid[]) from public;
grant execute on function public.public_user_display_names_for_ids(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: profile
-- ---------------------------------------------------------------------------
alter table public.profile enable row level security;

drop policy if exists "Profile readable by authenticated" on public.profile;
create policy "Profile readable by authenticated"
  on public.profile for select
  to authenticated
  using (true);

drop policy if exists "Profile insert own" on public.profile;
create policy "Profile insert own"
  on public.profile for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Profile update own" on public.profile;

-- ---------------------------------------------------------------------------
-- RLS: profile_follow
-- ---------------------------------------------------------------------------
alter table public.profile_follow enable row level security;

drop policy if exists "Follow rows readable if involved" on public.profile_follow;
create policy "Follow rows readable if involved"
  on public.profile_follow for select
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "Follow insert as self" on public.profile_follow;
create policy "Follow insert as self"
  on public.profile_follow for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id is distinct from following_id
  );

drop policy if exists "Follow delete as follower" on public.profile_follow;
create policy "Follow delete as follower"
  on public.profile_follow for delete
  to authenticated
  using (auth.uid() = follower_id);
