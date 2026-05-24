-- Feed: flag unlock rows for dedicated achievements so the client can show dedicated badge effects.

drop function if exists public.following_unlock_feed(int, timestamptz, uuid);

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
  actor_user_id uuid,
  actor_display_name text,
  actor_avatar_url text,
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
  event_at timestamptz,
  is_dedicated boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with activity as (
    select
      'unlock'::text as event_type,
      e.id as event_id,
      e.achievement_id,
      e.owner_user_id as user_id,
      e.owner_user_id as actor_user_id,
      coalesce(public.public_user_display_name(e.owner_user_id), '')::text as actor_display_name,
      p.avatar_url as actor_avatar_url,
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
      e.created_at as event_at,
      (a.dedicated_by_user_id is not null) as is_dedicated
    from public.profile_follow pf
    join public.achievement_unlock_events e on e.owner_user_id = pf.following_id
    join public.achievements a on a.id = e.achievement_id
    left join public.profile p on p.user_id = e.owner_user_id
    where pf.follower_id = auth.uid()
      and a.visibility = 'public'

    union all

    select
      'impression'::text as event_type,
      i.id as event_id,
      i.achievement_id,
      i.owner_user_id as user_id,
      i.actor_user_id as actor_user_id,
      coalesce(public.public_user_display_name(i.actor_user_id), '')::text as actor_display_name,
      p.avatar_url as actor_avatar_url,
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
      i.created_at as event_at,
      false as is_dedicated
    from public.achievement_impression_events i
    join public.achievements a on a.id = i.achievement_id
    left join public.profile p on p.user_id = i.actor_user_id
    where i.owner_user_id = auth.uid()

    union all

    select
      'dedication'::text as event_type,
      d.id as event_id,
      d.achievement_id,
      d.recipient_user_id as user_id,
      d.sender_user_id as actor_user_id,
      coalesce(public.public_user_display_name(d.sender_user_id), '')::text as actor_display_name,
      p.avatar_url as actor_avatar_url,
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
      d.created_at as event_at,
      true as is_dedicated
    from public.achievement_dedication_events d
    join public.achievements a on a.id = d.achievement_id
    left join public.profile p on p.user_id = d.sender_user_id
    where d.recipient_user_id = auth.uid()
  )
  select
    activity.event_type,
    activity.event_id,
    activity.achievement_id,
    activity.user_id,
    activity.actor_user_id,
    activity.actor_display_name,
    activity.actor_avatar_url,
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
    activity.event_at,
    activity.is_dedicated
  from activity
  where (
    p_cursor_updated_at is null
    or p_cursor_id is null
    or (activity.event_at, activity.event_id) < (p_cursor_updated_at, p_cursor_id)
  )
  order by activity.event_at desc, activity.event_id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.following_unlock_feed(int, timestamptz, uuid) from public;
grant execute on function public.following_unlock_feed(int, timestamptz, uuid) to authenticated;
