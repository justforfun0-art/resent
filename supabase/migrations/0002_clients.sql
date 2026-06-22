-- Resent: multi-client (sender workspaces) support.
-- Adds a `clients` table and scopes smtp_configs / api_keys / templates / emails
-- to a client. Backfills a "Default" client per existing user so existing data
-- keeps working. Run after 0001_init.sql.

-- ── clients ───────────────────────────────────────────────────────────────────
-- A "client" is a sender workspace: its own SMTP backend, keys, templates and
-- send log. One account (auth user) can own several.
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  slug        text not null,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists clients_user_id_idx on public.clients (user_id);

alter table public.clients enable row level security;
do $$ begin
  create policy "own clients" on public.clients
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── add client_id to scoped tables ────────────────────────────────────────────
alter table public.api_keys     add column if not exists client_id uuid references public.clients (id) on delete cascade;
alter table public.templates    add column if not exists client_id uuid references public.clients (id) on delete cascade;
alter table public.emails       add column if not exists client_id uuid references public.clients (id) on delete cascade;

create index if not exists api_keys_client_id_idx  on public.api_keys  (client_id);
create index if not exists templates_client_id_idx on public.templates (client_id);
create index if not exists emails_client_id_idx     on public.emails    (client_id);

-- ── smtp_configs becomes per-client instead of per-user ───────────────────────
-- Old shape: primary key (user_id), one row per user.
-- New shape: own id, a client_id (unique — one SMTP per client).
alter table public.smtp_configs add column if not exists id        uuid default gen_random_uuid();
alter table public.smtp_configs add column if not exists client_id uuid references public.clients (id) on delete cascade;

-- ── Backfill: one Default client per existing user, then point rows at it ─────
do $$
declare
  u record;
  cid uuid;
begin
  for u in (
    select distinct user_id from (
      select user_id from public.smtp_configs
      union select user_id from public.api_keys
      union select user_id from public.templates
      union select user_id from public.emails
    ) s
  ) loop
    insert into public.clients (user_id, name, slug, color)
    values (u.user_id, 'Default', 'default', '#6366f1')
    on conflict (user_id, slug) do nothing;

    select id into cid from public.clients
      where user_id = u.user_id and slug = 'default' limit 1;

    update public.smtp_configs set client_id = cid where user_id = u.user_id and client_id is null;
    update public.api_keys     set client_id = cid where user_id = u.user_id and client_id is null;
    update public.templates    set client_id = cid where user_id = u.user_id and client_id is null;
    update public.emails       set client_id = cid where user_id = u.user_id and client_id is null;
  end loop;
end $$;

-- Swap smtp_configs primary key from user_id to id, enforce one config per client.
do $$ begin
  alter table public.smtp_configs drop constraint smtp_configs_pkey;
exception when undefined_object then null; end $$;

do $$ begin
  alter table public.smtp_configs alter column id set not null;
  alter table public.smtp_configs add primary key (id);
exception when invalid_table_definition then null; end $$;

do $$ begin
  alter table public.smtp_configs add constraint smtp_configs_client_id_key unique (client_id);
exception when duplicate_table then null; end $$;
