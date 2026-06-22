import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/api-keys";

export type AuthResult =
  | { error: NextResponse }
  | {
      db: ReturnType<typeof createServiceClient>;
      apiKey: { id: string; user_id: string; client_id: string };
    };

// Resolve the API key from the Authorization header. Returns either an `error`
// response to short-circuit, or the service client + key row. Shared by the
// single-send and batch endpoints.
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return {
      error: NextResponse.json(
        { error: { message: "Missing API key. Use 'Authorization: Bearer <key>'." } },
        { status: 401 }
      ),
    };
  }
  const db = createServiceClient();
  const { data: apiKey } = await db
    .from("api_keys")
    .select("id, user_id, client_id, revoked_at")
    .eq("key_hash", hashApiKey(token))
    .maybeSingle();
  if (!apiKey || apiKey.revoked_at) {
    return {
      error: NextResponse.json(
        { error: { message: "Invalid or revoked API key." } },
        { status: 401 }
      ),
    };
  }
  return { db, apiKey };
}

// Public base URL for building tracking links.
export function appBaseUrl(req: NextRequest): string {
  return (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
}

// Enforce the per-key rate limit, returning a 429 response when exceeded (else
// null to proceed). Adds standard rate-limit headers.
export async function enforceRateLimit(
  db: ReturnType<typeof createServiceClient>,
  apiKeyId: string
): Promise<NextResponse | null> {
  const { checkRateLimit } = await import("@/lib/rate-limit");
  const rl = await checkRateLimit(db, apiKeyId);
  if (rl.allowed) return null;
  return NextResponse.json(
    { error: { message: "Rate limit exceeded. Slow down." } },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    }
  );
}
