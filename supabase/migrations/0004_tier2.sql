-- Resent Tier 2: suppression list + scheduled sends + SMTP encryption support.
-- Run after 0003_tier1.sql.

-- ── suppressions ─────────────────────────────────────────────────────────────
-- Addresses we must not send to for a given client. The send API checks this
-- first and marks matching emails 'suppressed' instead of sending.
create table if not exists public.suppressions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  email       text not null,
  reason      text not null default 'manual',   -- manual | hard_bounce | complaint
  created_at  timestamptz not null default now(),
  unique (client_id, email)
);
create index if not exists suppressions_client_idx on public.suppressions (client_id);

alter table public.suppressions enable row level security;
do $$ begin
  create policy "own suppressions" on public.suppressions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── emails: scheduled sends ──────────────────────────────────────────────────
-- When scheduled_at is set and in the future, the row is created as 'scheduled'
-- and a worker sends it once due. status gains: 'scheduled' | 'suppressed'.
alter table public.emails add column if not exists scheduled_at timestamptz;

-- Index to let the worker efficiently find due scheduled emails.
create index if not exists emails_scheduled_idx
  on public.emails (scheduled_at)
  where status = 'scheduled';

-- ── smtp_configs: encryption marker ──────────────────────────────────────────
-- password_encrypted flags whether `password` holds ciphertext (new rows) or
-- legacy plaintext. Lets us migrate gradually without breaking existing configs.
alter table public.smtp_configs
  add column if not exists password_encrypted boolean not null default false;
