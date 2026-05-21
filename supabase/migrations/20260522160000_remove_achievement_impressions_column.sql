-- Impressions live only in achievement_impression_events (feed + idempotency).

insert into public.achievement_impression_events (
  achievement_id,
  owner_user_id,
  actor_user_id
)
select
  a.id,
  a.user_id,
  actor_id
from public.achievements a
cross join lateral unnest(coalesce(a.impressions, '{}'::uuid[])) as actor_id
where actor_id is not null
on conflict (achievement_id, actor_user_id) do nothing;

create or replace function public.append_achievement_impression(p_achievement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.achievements%rowtype;
  v_inserted uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.achievements
  where id = p_achievement_id;

  if not found then
    raise exception 'achievement not found';
  end if;

  if v_row.user_id = v_uid then
    raise exception 'cannot impress own achievement';
  end if;

  if exists (
    select 1
    from public.achievement_impression_events e
    where e.achievement_id = p_achievement_id
      and e.actor_user_id = v_uid
  ) then
    return jsonb_build_object(
      'added', false,
      'owner_user_id', v_row.user_id,
      'title', coalesce(v_row.title, 'Achievement')
    );
  end if;

  insert into public.achievement_impression_events (
    achievement_id,
    owner_user_id,
    actor_user_id
  )
  values (p_achievement_id, v_row.user_id, v_uid)
  returning id into v_inserted;

  return jsonb_build_object(
    'added', true,
    'owner_user_id', v_row.user_id,
    'title', coalesce(v_row.title, 'Achievement')
  );
end;
$$;

drop index if exists public.achievements_impressions_gin_idx;

alter table public.achievements
  drop column if exists impressions;
