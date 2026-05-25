-- Whether an auth user id exists (for /u/[userId] 404 before loading achievements).

create or replace function public.auth_user_exists(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = target_user_id
  );
$$;

comment on function public.auth_user_exists(uuid) is
  'True when target_user_id is a row in auth.users (public profile routes).';

revoke all on function public.auth_user_exists(uuid) from public;
grant execute on function public.auth_user_exists(uuid) to anon, authenticated;
