create table if not exists public.achievement_share_invites (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  source_achievement_id uuid null references public.achievements (id) on delete set null,
  share_kind text not null default 'invite',
  title text null,
  description text null,
  category text null,
  icon text not null default 'trophy',
  icon_url text not null,
  icon_file_id text null,
  tone text null,
  achieved_at date null,
  token_hash text not null unique,
  status text not null default 'pending',
  claimed_by_user_id uuid null references auth.users (id) on delete set null,
  claimed_achievement_id uuid null references public.achievements (id) on delete set null,
  claimed_at timestamptz null,
  revoked_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievement_share_invites_status_check
    check (status in ('pending', 'claiming', 'claimed', 'revoked', 'expired')),
  constraint achievement_share_invites_share_kind_check
    check (share_kind in ('invite', 'showcase'))
);

create index if not exists achievement_share_invites_sender_idx
  on public.achievement_share_invites (sender_user_id, created_at desc);

create index if not exists achievement_share_invites_status_idx
  on public.achievement_share_invites (status, created_at desc);

alter table public.achievement_share_invites enable row level security;

create or replace function public.set_achievement_share_invites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_achievement_share_invites_updated_at on public.achievement_share_invites;
create trigger set_achievement_share_invites_updated_at
before update on public.achievement_share_invites
for each row
execute function public.set_achievement_share_invites_updated_at();

comment on table public.achievement_share_invites is
  'Single-use share-invite snapshots for achievements claimed by existing or newly created users.';

comment on column public.achievement_share_invites.token_hash is
  'SHA-256 hash of the raw invite token stored in the shared link.';

