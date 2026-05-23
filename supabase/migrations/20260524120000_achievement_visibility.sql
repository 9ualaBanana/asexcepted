-- Per-achievement visibility (public default; existing rows backfilled).

alter table public.achievements
  add column if not exists visibility text not null default 'public';

update public.achievements
set visibility = 'public'
where visibility is null or visibility not in ('public', 'private');

alter table public.achievements
  drop constraint if exists achievements_visibility_check;

alter table public.achievements
  add constraint achievements_visibility_check
  check (visibility in ('public', 'private'));

comment on column public.achievements.visibility is
  'public: visible on owner collection to everyone; private: only visible to owner.';

drop policy if exists "Achievements are publicly readable (authenticated)" on public.achievements;
drop policy if exists "Achievements are publicly readable (anon)" on public.achievements;

create policy "Achievements are publicly readable (authenticated)"
  on public.achievements
  for select
  to authenticated
  using (visibility = 'public' or auth.uid() = user_id);

create policy "Achievements are publicly readable (anon)"
  on public.achievements
  for select
  to anon
  using (visibility = 'public');
