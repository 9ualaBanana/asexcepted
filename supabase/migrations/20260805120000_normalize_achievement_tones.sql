-- Align stored achievement tones with the app palette:
-- rose | indigo | teal | orange | lime | fuchsia.
-- Legacy values that appeared in older clients/DB:
--   cyan  — old palette member (camera/waves toneByIcon)
--   gold  — original column default
--   sky   — old palette member

update public.achievements
set tone = case
  when tone = 'sky' then 'indigo'
  when tone in ('rose', 'indigo', 'teal', 'orange', 'lime', 'fuchsia') then tone
  else 'teal'
end
where tone is null
   or tone not in ('rose', 'indigo', 'teal', 'orange', 'lime', 'fuchsia');

alter table public.achievements
  alter column tone set default 'teal';

update public.achievement_share_invites
set tone = case
  when tone = 'sky' then 'indigo'
  when tone in ('rose', 'indigo', 'teal', 'orange', 'lime', 'fuchsia') then tone
  else 'teal'
end
where tone is not null
  and tone not in ('rose', 'indigo', 'teal', 'orange', 'lime', 'fuchsia');
