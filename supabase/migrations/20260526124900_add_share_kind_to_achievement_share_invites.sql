alter table public.achievement_share_invites
  add column if not exists share_kind text;

update public.achievement_share_invites
set share_kind = case
  when source_achievement_id is null then 'invite'
  else 'showcase'
end
where share_kind is null;

alter table public.achievement_share_invites
  alter column share_kind set default 'invite';

alter table public.achievement_share_invites
  alter column share_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'achievement_share_invites_share_kind_check'
  ) then
    alter table public.achievement_share_invites
      add constraint achievement_share_invites_share_kind_check
      check (share_kind in ('invite', 'showcase'));
  end if;
end
$$;

