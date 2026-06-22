import { NextRequest, NextResponse } from "next/server";
import { sendOne } from "@/lib/send-core";
import { authenticate, appBaseUrl, enforceRateLimit } from "@/lib/api-auth";

export const runtime = "nodejs";

// GET /api/v1/emails?limit=&status= — list this client's recent emails.
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  const { db, apiKey } = auth;

  const params = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") || 50), 1), 100);
  const status = params.get("status");

  let query = db
    .from("emails")
    .select(
      "id, from_email, to_emails, subject, status, scheduled_at, open_count, click_count, error, created_at"
    )
    .eq("client_id", apiKey.client_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) query = query.eq("status", status);

  const { data } = await query;
  return NextResponse.json({ data: data ?? [] }, { status: 200 });
}

// POST /api/v1/emails — send (or schedule) a single email.
// Body (Resend-compatible): { from?, to, cc?, bcc?, reply_to?, subject?, html?,
//   text?, template?, variables?, headers?, tags?, attachments?, scheduled_at?,
//   idempotency_key? }
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  const { db, apiKey } = auth;

  const limited = await enforceRateLimit(db, apiKey.id);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  // Idempotency: replay returns the original result instead of re-sending.
  const idempotencyKey =
    req.headers.get("idempotency-key") ||
    (typeof body.idempotency_key === "string" ? body.idempotency_key : null);
  if (idempotencyKey) {
    const { data: prior } = await db
      .from("emails")
      .select("id")
      .eq("api_key_id", apiKey.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (prior) {
      return NextResponse.json({ id: prior.id, idempotent: true }, { status: 200 });
    }
  }

  const res = await sendOne(
    {
      db,
      userId: apiKey.user_id,
      clientId: apiKey.client_id,
      apiKeyId: apiKey.id,
      baseUrl: appBaseUrl(req),
    },
    body,
    { idempotencyKey }
  );

  if (res.ok) return NextResponse.json({ id: res.id }, { status: 200 });
  return NextResponse.json(
    { id: res.id, error: { message: res.message } },
    { status: res.status }
  );
}
