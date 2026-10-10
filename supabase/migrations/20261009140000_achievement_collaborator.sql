-- One collaborator per achievement. Same row on both shelves.

alter table public.achievements
  add column if not exists collaborator_user_id uuid null references auth.users (id) on delete set null;

alter table public.achievements
  drop constraint if exists achievements_collaborator_not_owner_check;

alter table public.achievements
  add constraint achievements_collaborator_not_owner_check
  check (collaborator_user_id is distinct from user_id);

create index if not exists achievements_collaborator_user_id_idx
  on public.achievements (collaborator_user_id)
  where collaborator_user_id is not null;

comment on column public.achievements.collaborator_user_id is
  'Other collection that lists this same achievement. Lock and content stay on the row.';

-- Collaborator may update the row (unlock, leave). Content changes are rejected below.
drop policy if exists "Collaborators can update collaborated achievements" on public.achievements;
create policy "Collaborators can update collaborated achievements"
  on public.achievements
  for update
  to authenticated
  using (auth.uid() = collaborator_user_id)
  with check (
    collaborator_user_id is null
    or auth.uid() = collaborator_user_id
  );

create or replace function public.guard_collaborator_achievement_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;
  if auth.uid() is distinct from old.collaborator_user_id then
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.category is distinct from old.category
    or new.icon is distinct from old.icon
    or new.icon_url is distinct from old.icon_url
    or new.icon_file_id is distinct from old.icon_file_id
    or new.icon_asset_kind is distinct from old.icon_asset_kind
    or new.icon_asset_path is distinct from old.icon_asset_path
    or new.icon_cc_attribution is distinct from old.icon_cc_attribution
    or new.icon_model_yaw is distinct from old.icon_model_yaw
    or new.icon_model_pitch is distinct from old.icon_model_pitch
    or new.icon_model_animation_play is distinct from old.icon_model_animation_play
    or new.icon_model_animation_speed is distinct from old.icon_model_animation_speed
    or new.tone is distinct from old.tone
    or new.visibility is distinct from old.visibility
    or new.dedicated_by_user_id is distinct from old.dedicated_by_user_id
    or new.dedication_status is distinct from old.dedication_status
    or new.created_at is distinct from old.created_at
    or (
      new.collaborator_user_id is distinct from old.collaborator_user_id
      and new.collaborator_user_id is not null
    )
  then
    raise exception 'Collaborators can only unlock or leave this achievement.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_collaborator_achievement_update on public.achievements;
create trigger guard_collaborator_achievement_update
before update on public.achievements
for each row
execute function public.guard_collaborator_achievement_update();

-- Allow collaborate share kind on existing invite checks.
do $$
declare
  constraint_row record;
  invite_relations regclass[] := array['public.achievement_share_invites'::regclass];
begin
  if to_regclass('public.achievement_share_invites_v2') is not null then
    invite_relations := invite_relations || 'public.achievement_share_invites_v2'::regclass;
  end if;

  for constraint_row in
    select con.conname, con.conrelid::regclass as relation_name
    from pg_constraint con
    where con.contype = 'c'
      and con.conrelid = any (invite_relations)
      and pg_get_constraintdef(con.oid) ilike '%share_kind%'
  loop
    execute format(
      'alter table %s drop constraint %I',
      constraint_row.relation_name,
      constraint_row.conname
    );
  end loop;
end
$$;

alter table public.achievement_share_invites
  drop constraint if exists achievement_share_invites_share_kind_check;

alter table public.achievement_share_invites
  add constraint achievement_share_invites_share_kind_check
  check (share_kind in ('invite', 'showcase', 'collaborate'));

do $$
begin
  if to_regclass('public.achievement_share_invites_v2') is not null then
    alter table public.achievement_share_invites_v2
      drop constraint if exists achievement_share_invites_v2_share_kind_check;
    alter table public.achievement_share_invites_v2
      add constraint achievement_share_invites_v2_share_kind_check
      check (share_kind in ('invite', 'showcase', 'collaborate'));
  end if;
end
$$;

-- Followers of the owner or the collaborator see the same unlock.
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
    select distinct on (e.id)
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
      coalesce(a.icon_asset_kind, 'image') as icon_asset_kind,
      a.tone,
      a.achieved_at,
      a.created_at,
      a.updated_at,
      e.created_at as event_at,
      (a.dedicated_by_user_id is not null) as is_dedicated
    from public.achievement_unlock_events e
    join public.achievements a on a.id = e.achievement_id
    join public.profile_follow pf
      on pf.follower_id = auth.uid()
     and (
       pf.following_id = a.user_id
       or pf.following_id = a.collaborator_user_id
     )
    left join public.profile p on p.user_id = e.owner_user_id
    where a.visibility = 'public'
    order by e.id
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
