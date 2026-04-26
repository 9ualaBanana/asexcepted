-- Replace owner-only SELECT with public read (authenticated + anon). Safe if already applied from baseline.

drop policy if exists "Users can view own achievements" on public.achievements;
drop policy if exists "Achievements are publicly readable (authenticated)" on public.achievements;
drop policy if exists "Achievements are publicly readable (anon)" on public.achievements;

create policy "Achievements are publicly readable (authenticated)"
  on public.achievements
  for select
  to authenticated
  using (true);

create policy "Achievements are publicly readable (anon)"
  on public.achievements
  for select
  to anon
  using (true);
