-- Dedicate/share invites store a full achievement snapshot (including 3D badge fields).
-- For model_glb badges, GLB + poster are copied to invite-scoped storage paths.

comment on table public.achievement_share_invites is
  'Canonical achievement snapshot for share and dedicate links. Dedicate invites (share_kind invite) copy badge data from the sender collection row, pin 3D assets under invites/{id}/, then remove the sender collection row. Claims copy only from this snapshot into the recipient collection.';

comment on column public.achievement_share_invites.icon_url is
  'Public badge preview URL for this invite snapshot (poster PNG for model_glb).';

comment on column public.achievement_share_invites.icon_asset_path is
  'Private badge asset path for this snapshot. For model_glb dedicate invites this is invites/{invite_id}/badge.glb after pinning.';

comment on column public.achievement_share_invites.icon_asset_kind is
  'Badge kind snapshot: image or model_glb.';

comment on column public.achievement_share_invites.icon_model_yaw is
  'Default orbit yaw (radians) for model_glb preview and live viewer.';

comment on column public.achievement_share_invites.icon_model_pitch is
  'Default orbit pitch (radians) for model_glb preview and live viewer.';

alter table public.achievement_share_invites
  add column if not exists badge_assets_pinned_at timestamptz null;

comment on column public.achievement_share_invites.badge_assets_pinned_at is
  'When set, 3D badge files were copied to invite-scoped storage and icon_url/icon_asset_path on this row are authoritative for the link.';
