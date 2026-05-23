-- Public impression counts for badge UI (non-sensitive aggregate).

create or replace function public.achievement_impression_counts(p_achievement_ids uuid[])
returns table (achievement_id uuid, impression_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.achievement_id,
    count(*)::bigint as impression_count
  from public.achievement_impression_events e
  where e.achievement_id = any (p_achievement_ids)
  group by e.achievement_id;
$$;

revoke all on function public.achievement_impression_counts(uuid[]) from public;
grant execute on function public.achievement_impression_counts(uuid[]) to anon, authenticated;
