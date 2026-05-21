-- Unlock feed posts for followers (subscribers): one row per achievement unlock event.

create table if not exists public.achievement_unlock_events (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (achievement_id)
);

comment on table public.achievement_unlock_events is
  'One row when an achievement is unlocked; shown in followers'' feeds.';

create index if not exists achievement_unlock_events_owner_feed_idx
  on public.achievement_unlock_events (owner_user_id, created_at desc, id desc);

alter table public.achievement_unlock_events enable row level security;

create policy "Unlock events readable by authenticated"
  on public.achievement_unlock_events
  for select
  to authenticated
  using (true);

create or replace function public.log_achievement_unlock_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.is_locked = false then
    insert into public.achievement_unlock_events (achievement_id, owner_user_id, created_at)
    values (new.id, new.user_id, coalesce(new.updated_at, new.created_at, now()))
    on conflict (achievement_id) do nothing;
  elsif tg_op = 'UPDATE' and old.is_locked = true and new.is_locked = false then
    insert into public.achievement_unlock_events (achievement_id, owner_user_id, created_at)
    values (new.id, new.user_id, coalesce(new.updated_at, now()))
    on conflict (achievement_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_achievement_unlock_event on public.achievements;
create trigger trg_log_achievement_unlock_event
  after insert or update of is_locked on public.achievements
  for each row
  execute function public.log_achievement_unlock_event();

-- Backfill unlock events for achievements already unlocked.
insert into public.achievement_unlock_events (achievement_id, owner_user_id, created_at)
select
  a.id,
  a.user_id,
  coalesce(a.updated_at, a.created_at)
from public.achievements a
where a.is_locked = false
on conflict (achievement_id) do nothing;

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
      e.id as event_id,
      e.achievement_id,
      e.owner_user_id as user_id,
      coalesce(public.public_user_display_name(e.owner_user_id), '')::text as actor_display_name,
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
    where pf.follower_id = auth.uid()

    union all

    select
      'impression'::text as event_type,
      i.id as event_id,
      i.achievement_id,
      i.owner_user_id as user_id,
      coalesce(public.public_user_display_name(i.actor_user_id), '')::text as actor_display_name,
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
    where i.owner_user_id = auth.uid()
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
