-- Resent Tier 1: attachments/reply-to/headers/tags + idempotency + open/click
-- tracking + outbound webhooks. Run after 0002_clients.sql.

-- ── emails: richer send metadata + tracking columns ──────────────────────────
alter table public.emails add column if not exists reply_to        text;
alter table public.emails add column if not exists headers         jsonb;
alter table public.emails add column if not exists tags            jsonb;
alter table public.emails add column if not exists idempotency_key text;
alter table public.emails add column if not exists opened_at       timestamptz;
alter table public.emails add column if not exists clicked_at      timestamptz;
alter table public.emails add column if not exists open_count      integer not null default 0;
alter table public.emails add column if not exists click_count     integer not null default 0;

-- Idempotency is scoped to the API key that sent the request: a retried request
-- with the same key returns the original email instead of sending twice.
create unique index if not exists emails_idem_key_idx
  on public.emails (api_key_id, idempotency_key)
  where idempotency_key is not null;

-- ── email_events: per-open / per-click tracking log ──────────────────────────
create table if not exists public.email_events (
  id          uuid primary key default gen_random_uuid(),
  email_id    uuid not null references public.emails (id) on delete cascade,
  client_id   uuid references public.clients (id) on delete cascade,
  type        text not null,                 -- 'opened' | 'clicked'
  url         text,                          -- the destination, for clicks
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists email_events_email_idx on public.email_events (email_id);

alter table public.email_events enable row level security;
do $$ begin
  -- Owner can read their own events (joined through emails -> client ownership).
  create policy "own email_events" on public.email_events
    for select using (
      exists (
        select 1 from public.clients c
        where c.id = email_events.client_id and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- ── webhooks: user-registered endpoints ──────────────────────────────────────
create table if not exists public.webhooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  url         text not null,
  secret      text not null,                 -- used to HMAC-sign payloads
  events      text[] not null default '{}',  -- subscribed event types
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists webhooks_client_idx on public.webhooks (client_id);

alter table public.webhooks enable row level security;
do $$ begin
  create policy "own webhooks" on public.webhooks
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── webhook_deliveries: delivery attempts / debugging ────────────────────────
create table if not exists public.webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  webhook_id   uuid not null references public.webhooks (id) on delete cascade,
  event        text not null,
  status_code  integer,
  ok           boolean not null default false,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists webhook_deliveries_webhook_idx
  on public.webhook_deliveries (webhook_id, created_at desc);

alter table public.webhook_deliveries enable row level security;
do $$ begin
  create policy "own webhook_deliveries" on public.webhook_deliveries
    for select using (
      exists (
        select 1 from public.webhooks w
        where w.id = webhook_deliveries.webhook_id and w.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
