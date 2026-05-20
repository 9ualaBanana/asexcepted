-- Same browser FCM token must move to the signed-in user when switching accounts.

create or replace function public.claim_push_notification_token(
  p_token text,
  p_platform text default 'web',
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if length(trim(coalesce(p_token, ''))) < 20 then
    raise exception 'invalid token';
  end if;

  insert into public.push_notification_tokens (
    user_id,
    token,
    platform,
    user_agent,
    last_seen_at
  )
  values (
    auth.uid(),
    trim(p_token),
    coalesce(nullif(trim(p_platform), ''), 'web'),
    left(p_user_agent, 512),
    now()
  )
  on conflict (token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    user_agent = excluded.user_agent,
    last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.claim_push_notification_token(text, text, text) from public;
grant execute on function public.claim_push_notification_token(text, text, text) to authenticated;
