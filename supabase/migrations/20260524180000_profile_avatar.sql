-- Profile avatars (ImageKit) + feed actor ids for avatar overlay.

alter table public.profile
  add column if not exists avatar_url text,
  add column if not exists avatar_file_id text;

comment on column public.profile.avatar_url is
  'ImageKit URL for profile picture.';
comment on column public.profile.avatar_file_id is
  'ImageKit file id for profile picture (delete on replace).';

drop policy if exists "Profile update own" on public.profile;
create policy "Profile update own"
  on public.profile
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Return type adds actor_user_id + actor_avatar_url; must drop before replace.
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
      e.created_at as event_at
    from public.profile_follow pf
    join public.achievement_unlock_events e on e.owner_user_id = pf.following_id
    join public.achievements a on a.id = e.achievement_id
    left join public.profile p on p.user_id = e.owner_user_id
    where pf.follower_id = auth.uid()

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
      i.created_at as event_at
    from public.achievement_impression_events i
    join public.achievements a on a.id = i.achievement_id
    left join public.profile p on p.user_id = i.actor_user_id
    where i.owner_user_id = auth.uid()
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

revoke all on function public.following_unlock_feed(int, timestamptz, uuid) from public;
grant execute on function public.following_unlock_feed(int, timestamptz, uuid) to authenticated;
