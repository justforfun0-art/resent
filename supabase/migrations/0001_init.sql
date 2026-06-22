-- Resent: email platform schema
-- Run this in the Supabase SQL editor or via `supabase db push`.

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── api_keys ────────────────────────────────────────────────────────────────
-- We store only an HMAC of the key (key_hash). The plaintext is shown once at
-- creation time and never persisted. key_prefix lets users identify a key.
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  key_hash    text not null unique,
  key_prefix  text not null,
  last_used_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

-- ── smtp_configs ────────────────────────────────────────────────────────────
-- One SMTP configuration per user (the sending backend).
create table if not exists public.smtp_configs (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  host        text not null,
  port        integer not null default 587,
  secure      boolean not null default false,
  username    text not null,
  password    text not null,
  from_email  text not null,
  from_name   text,
  updated_at  timestamptz not null default now()
);

-- ── templates ───────────────────────────────────────────────────────────────
-- Reusable templates with {{variable}} placeholders.
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  slug        text not null,
  name        text not null,
  subject     text not null default '',
  html        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists templates_user_id_idx on public.templates (user_id);

-- ── emails ──────────────────────────────────────────────────────────────────
-- The send log. status: queued | sent | failed
create table if not exists public.emails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  api_key_id  uuid references public.api_keys (id) on delete set null,
  from_email  text not null,
  to_emails   text[] not null,
  cc_emails   text[],
  bcc_emails  text[],
  subject     text not null default '',
  html        text,
  text        text,
  template_id uuid references public.templates (id) on delete set null,
  status      text not null default 'queued',
  provider_message_id text,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists emails_user_id_created_idx on public.emails (user_id, created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.api_keys     enable row level security;
alter table public.smtp_configs enable row level security;
alter table public.templates    enable row level security;
alter table public.emails        enable row level security;

-- Owner-only access. The service role bypasses RLS, which the send API relies on.
create policy "own api_keys"     on public.api_keys     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own smtp_configs" on public.smtp_configs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own templates"    on public.templates    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own emails"       on public.emails        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at fresh on templates / smtp_configs.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger templates_touch    before update on public.templates    for each row execute function public.touch_updated_at();
create trigger smtp_configs_touch  before update on public.smtp_configs for each row execute function public.touch_updated_at();
