-- Enable Supabase Realtime for feed-related tables (INSERT events).

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'achievement_unlock_events'
  ) then
    alter publication supabase_realtime add table public.achievement_unlock_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'achievement_impression_events'
  ) then
    alter publication supabase_realtime add table public.achievement_impression_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profile_follow'
  ) then
    alter publication supabase_realtime add table public.profile_follow;
  end if;
end $$;
