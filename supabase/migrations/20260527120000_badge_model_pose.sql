alter table public.achievements
  add column if not exists icon_model_yaw double precision not null default 0;

alter table public.achievements
  add column if not exists icon_model_pitch double precision not null default 0;

comment on column public.achievements.icon_model_yaw is
  'Initial horizontal orbit (radians) for model_glb badges. Applied on detail/share/embed load.';

comment on column public.achievements.icon_model_pitch is
  'Initial vertical orbit (radians) for model_glb badges. Applied on detail/share/embed load.';

alter table public.achievement_share_invites
  add column if not exists icon_model_yaw double precision not null default 0;

alter table public.achievement_share_invites
  add column if not exists icon_model_pitch double precision not null default 0;

comment on column public.achievement_share_invites.icon_model_yaw is
  'Snapshot of initial model yaw for shared/dedicated badge assets.';

comment on column public.achievement_share_invites.icon_model_pitch is
  'Snapshot of initial model pitch for shared/dedicated badge assets.';
