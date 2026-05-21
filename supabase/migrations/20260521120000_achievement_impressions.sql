-- Viewer impressions on achievements (uuid[] of auth user ids who double-tapped the badge).

alter table public.achievements
  add column if not exists impressions uuid[] not null default '{}';

comment on column public.achievements.impressions is
  'Auth user ids who left an impression on this achievement (double-tap on badge).';

create index if not exists achievements_impressions_gin_idx
  on public.achievements using gin (impressions);

create or replace function public.append_achievement_impression(p_achievement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.achievements%rowtype;
  v_added boolean;
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
  set
    impressions = array_append(coalesce(impressions, '{}'::uuid[]), v_uid),
    updated_at = now()
  where id = p_achievement_id;

  return jsonb_build_object(
    'added', true,
    'owner_user_id', v_row.user_id,
    'title', coalesce(v_row.title, 'Achievement')
  );
end;
$$;

revoke all on function public.append_achievement_impression(uuid) from public;
grant execute on function public.append_achievement_impression(uuid) to authenticated;
