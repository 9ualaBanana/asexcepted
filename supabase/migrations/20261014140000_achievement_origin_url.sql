alter table public.achievements
  add column if not exists origin_url text;

alter table public.achievement_share_invites
  add column if not exists origin_url text;

comment on column public.achievements.origin_url is
  'Optional http(s) origin for the achievement artifact. Shown as the title link on detail and invite surfaces.';

comment on column public.achievement_share_invites.origin_url is
  'Snapshot of the achievement origin URL for a dedicate invite.';

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
    or new.origin_url is distinct from old.origin_url
    or new.description is distinct from old.description
    or new.category is distinct from old.category
    or new.icon is distinct from old.icon
    or new.icon_url is distinct from old.icon_url
    or new.icon_file_id is distinct from old.icon_file_id
    or new.icon_asset_kind is distinct from old.icon_asset_kind
    or new.icon_asset_path is distinct from old.icon_asset_path
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
