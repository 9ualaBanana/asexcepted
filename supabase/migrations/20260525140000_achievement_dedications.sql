-- Dedicated achievements: admin/sender creates locked private pending rows for a recipient.
-- Private achievements never emit unlock_events (followers are not notified).

alter table public.achievements
  add column if not exists dedicated_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists dedication_status text;

alter table public.achievements
  drop constraint if exists achievements_dedication_status_check;

alter table public.achievements
  add constraint achievements_dedication_status_check
  check (dedication_status is null or dedication_status in ('pending', 'accepted'));

comment on column public.achievements.dedicated_by_user_id is
  'User who dedicated this achievement (null = self-created).';
comment on column public.achievements.dedication_status is
  'pending: in recipient queue, not in grid; accepted: in collection; null: normal self-created.';

create index if not exists achievements_pending_dedication_idx
  on public.achievements (user_id, created_at desc)
  where dedication_status = 'pending';

-- Feed + push anchor for dedications (recipient inbox).
create table if not exists public.achievement_dedication_events (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (achievement_id)
);

create index if not exists achievement_dedication_events_recipient_idx
  on public.achievement_dedication_events (recipient_user_id, created_at desc);

alter table public.achievement_dedication_events enable row level security;

drop policy if exists "Dedication events readable by recipient" on public.achievement_dedication_events;
create policy "Dedication events readable by recipient"
  on public.achievement_dedication_events
  for select
  to authenticated
  using (recipient_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Unlock events: never log private achievements (solidified product policy).
-- ---------------------------------------------------------------------------
create or replace function public.log_achievement_unlock_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.dedication_status, '') = 'pending' then
    return new;
  end if;

  if new.visibility = 'private' then
    return new;
  end if;

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

comment on function public.log_achievement_unlock_event() is
  'Inserts unlock feed rows only for public, non-pending achievements when unlocked.';

-- ---------------------------------------------------------------------------
-- Feed RPC: dedication branch + public-only unlock branch
-- ---------------------------------------------------------------------------
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
      i.created_at as event_at
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
      d.created_at as event_at
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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'achievement_dedication_events'
  ) then
    alter publication supabase_realtime add table public.achievement_dedication_events;
  end if;
end $$;
