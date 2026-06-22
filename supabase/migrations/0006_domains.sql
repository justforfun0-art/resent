-- Resent Tier 3b: sending domains + DKIM. Run after 0005_rate_limits.sql.

-- ── domains ──────────────────────────────────────────────────────────────────
-- A verified sending domain for a client. We generate a DKIM keypair per domain;
-- the private key signs outbound mail, the public key goes in a DNS TXT record
-- the user adds. `verified` flips true once we confirm the DKIM record via DNS.
create table if not exists public.domains (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  client_id     uuid not null references public.clients (id) on delete cascade,
  name          text not null,                         -- e.g. mail.example.com
  dkim_selector text not null default 'resent',
  dkim_private  text not null,                         -- PEM, server-only
  dkim_public   text not null,                         -- base64 DER for the TXT record
  verified      boolean not null default false,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (client_id, name)
);
create index if not exists domains_client_idx on public.domains (client_id);

alter table public.domains enable row level security;
do $$ begin
  create policy "own domains" on public.domains
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
