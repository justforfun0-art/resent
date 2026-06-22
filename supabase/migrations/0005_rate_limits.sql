-- Resent Tier 3a: per-API-key rate limiting + an index for listing emails.
-- Run after 0004_tier2.sql.

-- ── rate_limits ──────────────────────────────────────────────────────────────
-- Fixed-window counter per API key. We upsert a row keyed by (api_key_id,
-- window_start) and increment `count`; the send API rejects once it exceeds the
-- limit within the current window.
create table if not exists public.rate_limits (
  api_key_id   uuid not null references public.api_keys (id) on delete cascade,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (api_key_id, window_start)
);

-- Atomic increment helper: bumps the counter for the current window and returns
-- the new count. SECURITY DEFINER so the service role can call it; it touches
-- only the rate_limits table.
create or replace function public.bump_rate_limit(
  p_api_key_id uuid,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count integer;
begin
  insert into public.rate_limits (api_key_id, window_start, count)
  values (p_api_key_id, p_window_start, 1)
  on conflict (api_key_id, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into new_count;
  return new_count;
end; $$;

-- Lock down the function: only the service role (used by the send API) should
-- call it, never anon/authenticated.
revoke all on function public.bump_rate_limit(uuid, timestamptz) from public, anon, authenticated;

-- Helps list/retrieve queries and cleanup of old windows.
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
