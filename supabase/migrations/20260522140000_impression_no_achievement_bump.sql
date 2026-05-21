-- Impressions must not touch achievements.updated_at (avoids resurfacing the badge in unlock feeds).

create or replace function public.append_achievement_impression(p_achievement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.achievements%rowtype;
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

  if v_uid = any (coalesce(v_row.impressions, '{}'::uuid[])) then
    return jsonb_build_object(
      'added', false,
      'owner_user_id', v_row.user_id,
      'title', coalesce(v_row.title, 'Achievement')
    );
  end if;

  update public.achievements
  set impressions = array_append(coalesce(impressions, '{}'::uuid[]), v_uid)
  where id = p_achievement_id;

  insert into public.achievement_impression_events (
    achievement_id,
    owner_user_id,
    actor_user_id
  )
  values (p_achievement_id, v_row.user_id, v_uid);

  return jsonb_build_object(
    'added', true,
    'owner_user_id', v_row.user_id,
    'title', coalesce(v_row.title, 'Achievement')
  );
end;
$$;
