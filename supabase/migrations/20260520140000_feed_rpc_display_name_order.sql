-- Feed RPC: canonical display name, sort by updated_at for fresh unlocks, cursor on (updated_at, id).

drop function if exists public.following_unlock_feed(int, timestamptz, uuid);

create or replace function public.following_unlock_feed(
  p_limit int default 20,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  achievement_id uuid,
  user_id uuid,
  actor_display_name text,
  title text,
  description text,
  category text,
  icon text,
  icon_url text,
  icon_file_id text,
  tone text,
  achieved_at date,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    a.id as achievement_id,
    a.user_id,
    coalesce(public.public_user_display_name(a.user_id), '')::text as actor_display_name,
    a.title,
    a.description,
    a.category,
    a.icon,
    a.icon_url,
    a.icon_file_id,
    a.tone,
    a.achieved_at,
    a.created_at,
    a.updated_at
  from public.profile_follow pf
  join public.achievements a on a.user_id = pf.following_id
  where pf.follower_id = auth.uid()
    and a.is_locked = false
    and (
      p_cursor_updated_at is null
      or p_cursor_id is null
      or (a.updated_at, a.id) < (p_cursor_updated_at, p_cursor_id)
    )
  order by a.updated_at desc, a.created_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.following_unlock_feed(int, timestamptz, uuid) from public;
grant execute on function public.following_unlock_feed(int, timestamptz, uuid) to authenticated;
