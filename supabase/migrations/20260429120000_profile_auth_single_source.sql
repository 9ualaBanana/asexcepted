-- Upgrade from profile.display_name duplicate: anchor-only profile; search/lists read auth.users.

drop index if exists public.profile_display_name_trgm_idx;
alter table public.profile drop column if exists display_name;

drop policy if exists "Profile update own" on public.profile;

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
