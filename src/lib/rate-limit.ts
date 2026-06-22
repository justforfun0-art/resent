// Fixed-window rate limiting per API key, backed by the rate_limits table and
// the bump_rate_limit() SQL function (atomic increment). Defaults to 10 req/s,
// overridable via RATE_LIMIT_PER_SECOND. Fails open on DB errors so a limiter
// hiccup never blocks legitimate sends.

import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 1000;

function limit(): number {
  const n = Number(process.env.RATE_LIMIT_PER_SECOND || 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
};

export async function checkRateLimit(
  db: SupabaseClient,
  apiKeyId: string
): Promise<RateLimitResult> {
  const max = limit();
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS);

  const { data, error } = await db.rpc("bump_rate_limit", {
    p_api_key_id: apiKeyId,
    p_window_start: windowStart.toISOString(),
  });

  // Fail open: if the limiter can't run, allow the request.
  if (error || typeof data !== "number") {
    return { allowed: true, limit: max, remaining: max, retryAfterMs: 0 };
  }

  const count = data;
  const allowed = count <= max;
  const nextWindow = windowStart.getTime() + WINDOW_MS;
  return {
    allowed,
    limit: max,
    remaining: Math.max(0, max - count),
    retryAfterMs: allowed ? 0 : nextWindow - now,
  };
}
