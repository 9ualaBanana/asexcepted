-- Public-readable display label for an auth user (metadata display_name / full_name / name, else email).
-- Used by /u/[userId] when the viewer is not the owner. SECURITY DEFINER reads auth.users only inside this function.

create or replace function public.public_user_display_name(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    u.email::text
  )
  from auth.users u
  where u.id = target_user_id
  limit 1;
$$;

comment on function public.public_user_display_name(uuid) is
  'Returns display_name / full_name / name from raw_user_meta_data, else email, for public UI (e.g. achievements page header).';

revoke all on function public.public_user_display_name(uuid) from public;
grant execute on function public.public_user_display_name(uuid) to anon, authenticated;
