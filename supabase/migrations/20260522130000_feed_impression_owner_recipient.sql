-- Impression feed rows go to the achievement owner (same recipient as push), not their followers.

create or replace function public.following_unlock_feed(
  p_limit int default 20,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  event_type text,
  event_id uuid,
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
  updated_at timestamptz,
  event_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with activity as (
    select
      'unlock'::text as event_type,
      a.id as event_id,
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
      a.updated_at,
      a.updated_at as event_at
    from public.profile_follow pf
    join public.achievements a on a.user_id = pf.following_id
    where pf.follower_id = auth.uid()
      and a.is_locked = false

    union all

    select
      'impression'::text as event_type,
      e.id as event_id,
      e.achievement_id,
      e.owner_user_id as user_id,
      coalesce(public.public_user_display_name(e.actor_user_id), '')::text as actor_display_name,
      a.title,
      a.description,
      a.category,
      a.icon,
      a.icon_url,
      a.icon_file_id,
      a.tone,
      a.achieved_at,
      a.created_at,
      a.updated_at,
      e.created_at as event_at
    from public.achievement_impression_events e
    join public.achievements a on a.id = e.achievement_id
    where e.owner_user_id = auth.uid()
  )
  select
    activity.event_type,
    activity.event_id,
    activity.achievement_id,
    activity.user_id,
    activity.actor_display_name,
    activity.title,
    activity.description,
    activity.category,
    activity.icon,
    activity.icon_url,
    activity.icon_file_id,
    activity.tone,
    activity.achieved_at,
    activity.created_at,
    activity.updated_at,
    activity.event_at
  from activity
  where (
    p_cursor_updated_at is null
    or p_cursor_id is null
    or (activity.event_at, activity.event_id) < (p_cursor_updated_at, p_cursor_id)
  )
  order by activity.event_at desc, activity.event_id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
