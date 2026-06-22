-- Resent Tier 3c: audiences (contact lists) + broadcasts (campaigns).
-- Run after 0006_domains.sql.

-- ── audiences ────────────────────────────────────────────────────────────────
create table if not exists public.audiences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists audiences_client_idx on public.audiences (client_id);

-- ── contacts ─────────────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  audience_id  uuid not null references public.audiences (id) on delete cascade,
  email        text not null,
  first_name   text,
  last_name    text,
  unsubscribed boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (audience_id, email)
);
create index if not exists contacts_audience_idx on public.contacts (audience_id);

-- ── broadcasts ───────────────────────────────────────────────────────────────
-- A one-off campaign to an audience. status: draft | sending | sent
create table if not exists public.broadcasts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete cascade,
  audience_id  uuid not null references public.audiences (id) on delete cascade,
  name         text not null,
  subject      text not null default '',
  html         text not null default '',
  status       text not null default 'draft',
  sent_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists broadcasts_client_idx on public.broadcasts (client_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.audiences  enable row level security;
alter table public.contacts   enable row level security;
alter table public.broadcasts enable row level security;

do $$ begin
  create policy "own audiences" on public.audiences
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own contacts" on public.contacts
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own broadcasts" on public.broadcasts
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
