alter table public.achievements
  add column if not exists icon_model_animation_play boolean not null default true;

alter table public.achievements
  add column if not exists icon_model_animation_speed double precision not null default 1;

update public.achievements
set
  icon_model_animation_play = coalesce(icon_model_animation_play, true),
  icon_model_animation_speed = greatest(0.1, least(2, coalesce(icon_model_animation_speed, 1)));

comment on column public.achievements.icon_model_animation_play is
  'Whether model_glb animation should auto-play in viewers.';

comment on column public.achievements.icon_model_animation_speed is
  'Playback speed multiplier for model_glb animation (clamped to 0.1..2).';
