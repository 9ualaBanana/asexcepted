-- Canonical `public.achievements` table, indexes, RLS, and updated_at trigger.

create extension if not exists pgcrypto;

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text,
  description text,
  category text,
  icon text not null default 'trophy',
  tone text not null default 'gold',
  is_locked boolean not null default false,
  achieved_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.achievements
  add column if not exists tone text not null default 'gold';

alter table public.achievements
  add column if not exists is_locked boolean not null default false;

alter table public.achievements
  alter column description drop not null;

alter table public.achievements
  add column if not exists icon_url text;

comment on column public.achievements.icon_url is
  'Optional remote badge image URL (e.g. ImageKit).';

alter table public.achievements
  add column if not exists icon_file_id text;

create index if not exists achievements_user_id_idx on public.achievements (user_id);
create index if not exists achievements_user_date_idx on public.achievements (user_id, achieved_at desc, created_at desc);

alter table public.achievements enable row level security;

drop policy if exists "Users can view own achievements" on public.achievements;
create policy "Users can view own achievements"
  on public.achievements
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own achievements" on public.achievements;
create policy "Users can insert own achievements"
  on public.achievements
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own achievements" on public.achievements;
create policy "Users can update own achievements"
  on public.achievements
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own achievements" on public.achievements;
create policy "Users can delete own achievements"
  on public.achievements
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_achievements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_achievements_updated_at on public.achievements;
create trigger set_achievements_updated_at
before update on public.achievements
for each row
execute function public.set_achievements_updated_at();
