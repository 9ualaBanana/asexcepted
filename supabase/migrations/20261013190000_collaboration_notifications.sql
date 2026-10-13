alter table public.achievement_unlock_events
  add column if not exists actor_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists collaborator_user_id uuid references auth.users (id) on delete set null;

update public.achievement_unlock_events
set actor_user_id = owner_user_id
where actor_user_id is null;

alter table public.achievement_unlock_events
  alter column actor_user_id set not null;

comment on column public.achievement_unlock_events.actor_user_id is
  'User who unlocked the achievement. Followers and the other collaborator are notified about this user.';

create or replace function public.log_achievement_unlock_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  if coalesce(new.dedication_status, '') = 'pending' then
    return new;
  end if;

  if new.visibility = 'private' then
    return new;
  end if;

  actor := new.user_id;
  if auth.uid() is not null and (
    auth.uid() = new.user_id
    or auth.uid() = new.collaborator_user_id
  ) then
    actor := auth.uid();
  end if;

  if tg_op = 'INSERT' and new.is_locked = false then
    insert into public.achievement_unlock_events (
      achievement_id,
      owner_user_id,
      actor_user_id,
      collaborator_user_id,
      created_at
    )
    values (
      new.id,
      new.user_id,
      actor,
      new.collaborator_user_id,
      coalesce(new.updated_at, new.created_at, now())
    )
    on conflict (achievement_id) do nothing;
  elsif tg_op = 'UPDATE' and old.is_locked = true and new.is_locked = false then
    insert into public.achievement_unlock_events (
      achievement_id,
      owner_user_id,
      actor_user_id,
      collaborator_user_id,
      created_at
    )
    values (
      new.id,
      new.user_id,
      actor,
      new.collaborator_user_id,
      coalesce(new.updated_at, now())
    )
    on conflict (achievement_id) do nothing;
  end if;
  return new;
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
  actor_user_id uuid,
  actor_display_name text,
  actor_avatar_url text,
  title text,
  description text,
  category text,
  icon text,
  icon_url text,
  icon_file_id text,
  icon_asset_kind text,
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
  with unlocks as (
    select
      'unlock'::text as event_type,
      e.id as event_id,
      e.achievement_id,
      e.owner_user_id as user_id,
      e.actor_user_id as actor_user_id,
      coalesce(public.public_user_display_name(e.actor_user_id), '')::text as actor_display_name,
      p.avatar_url as actor_avatar_url,
      a.title,
      a.description,
      a.category,
      a.icon,
      a.icon_url,
      a.icon_file_id,
      coalesce(a.icon_asset_kind, 'image') as icon_asset_kind,
      a.tone,
      a.achieved_at,
      a.created_at,
      a.updated_at,
      e.created_at as event_at,
      (a.dedicated_by_user_id is not null) as is_dedicated
    from public.achievement_unlock_events e
    join public.achievements a on a.id = e.achievement_id
    left join public.profile p on p.user_id = e.actor_user_id
    where a.visibility = 'public'
      and (
        exists (
          select 1
          from public.profile_follow pf
          where pf.follower_id = auth.uid()
            and (
              pf.following_id = a.user_id
              or pf.following_id = a.collaborator_user_id
            )
        )
        or (
          auth.uid() in (a.user_id, a.collaborator_user_id)
          and auth.uid() is distinct from e.actor_user_id
        )
      )
  ),
  activity as (
    select * from unlocks

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
      coalesce(a.icon_asset_kind, 'image') as icon_asset_kind,
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
      coalesce(a.icon_asset_kind, 'image') as icon_asset_kind,
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
    activity.icon_asset_kind,
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
