alter table public.achievements
  add column if not exists icon_asset_kind text not null default 'image';

alter table public.achievements
  add column if not exists icon_asset_path text;

alter table public.achievements
  add column if not exists icon_cc_attribution text;

alter table public.achievements
  drop constraint if exists achievements_icon_asset_kind_check;

alter table public.achievements
  add constraint achievements_icon_asset_kind_check
    check (icon_asset_kind in ('image', 'model_glb'));

comment on column public.achievements.icon_url is
  'Canonical public badge preview URL for both image and 3D badge assets.';

comment on column public.achievements.icon_asset_kind is
  'Badge asset kind. image uses icon_url directly; model_glb uses icon_url as generated preview plus a private model path.';

comment on column public.achievements.icon_asset_path is
  'Private Supabase Storage object path for the backing 3D badge asset.';

comment on column public.achievements.icon_cc_attribution is
  'Optional Creative Commons or custom attribution text shown in badge UI.';

alter table public.achievement_share_invites
  add column if not exists icon_asset_kind text not null default 'image';

alter table public.achievement_share_invites
  add column if not exists icon_asset_path text;

alter table public.achievement_share_invites
  add column if not exists icon_cc_attribution text;

alter table public.achievement_share_invites
  drop constraint if exists achievement_share_invites_icon_asset_kind_check;

alter table public.achievement_share_invites
  add constraint achievement_share_invites_icon_asset_kind_check
    check (icon_asset_kind in ('image', 'model_glb'));

comment on column public.achievement_share_invites.icon_url is
  'Canonical public badge preview URL snapshot used across share surfaces.';

comment on column public.achievement_share_invites.icon_asset_path is
  'Private Supabase Storage object path snapshot for the backing 3D badge asset.';

comment on column public.achievement_share_invites.icon_cc_attribution is
  'Read-only attribution text snapshot for the shared badge asset.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'achievement-badge-previews',
  'achievement-badge-previews',
  true,
  5242880,
  array['image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'achievement-badge-models',
  'achievement-badge-models',
  false,
  52428800,
  array['model/gltf-binary', 'application/octet-stream']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
