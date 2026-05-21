-- Feed entries when someone leaves an impression on a followed user's achievement.

create table if not exists public.achievement_impression_events (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (achievement_id, actor_user_id)
);

comment on table public.achievement_impression_events is
  'One row per viewer impression; shown in the achievement owner''s feed (same as push recipient).';

create index if not exists achievement_impression_events_owner_feed_idx
  on public.achievement_impression_events (owner_user_id, created_at desc, id desc);

alter table public.achievement_impression_events enable row level security;

create policy "Impression events readable by authenticated"
  on public.achievement_impression_events
  for select
  to authenticated
  using (true);

-- Log impression events; do not bump achievements.updated_at (keeps unlock feed clean).
create or replace function public.append_achievement_impression(p_achievement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.achievements%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.achievements
  where id = p_achievement_id;

  if not found then
    raise exception 'achievement not found';
  end if;

  if v_row.user_id = v_uid then
    raise exception 'cannot impress own achievement';
  end if;

  if exists (
    select 1
    from public.achievement_impression_events e
    where e.achievement_id = p_achievement_id
      and e.actor_user_id = v_uid
  ) then
    return jsonb_build_object(
      'added', false,
      'owner_user_id', v_row.user_id,
      'title', coalesce(v_row.title, 'Achievement')
    );
  end if;

  insert into public.achievement_impression_events (
    achievement_id,
    owner_user_id,
    actor_user_id
  )
  values (p_achievement_id, v_row.user_id, v_uid);

  return jsonb_build_object(
    'added', true,
    'owner_user_id', v_row.user_id,
    'title', coalesce(v_row.title, 'Achievement')
  );
end;
$$;

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

revoke all on function public.following_unlock_feed(int, timestamptz, uuid) from public;
grant execute on function public.following_unlock_feed(int, timestamptz, uuid) to authenticated;
