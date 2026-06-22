import { NextRequest, NextResponse } from "next/server";
import { sendOne } from "@/lib/send-core";
import { authenticate, appBaseUrl, enforceRateLimit } from "@/lib/api-auth";

export const runtime = "nodejs";

const MAX_BATCH = 100;

// POST /api/v1/emails/batch — send up to 100 emails in one request.
// Body: an array of the same objects accepted by POST /api/v1/emails, or
// { emails: [...] }. Returns { data: [{ id }|{ error }], ... } per item, in order.
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  const { db, apiKey } = auth;

  const limited = await enforceRateLimit(db, apiKey.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).emails)
      ? ((body as Record<string, unknown>).emails as unknown[])
      : null;

  if (!items)
    return NextResponse.json(
      { error: { message: "Body must be an array of emails, or { emails: [...] }." } },
      { status: 422 }
    );
  if (items.length === 0)
    return NextResponse.json({ data: [] }, { status: 200 });
  if (items.length > MAX_BATCH)
    return NextResponse.json(
      { error: { message: `Batch is limited to ${MAX_BATCH} emails.` } },
      { status: 422 }
    );

  const ctx = {
    db,
    userId: apiKey.user_id,
    clientId: apiKey.client_id,
    apiKeyId: apiKey.id,
    baseUrl: appBaseUrl(req),
  };

  // Send sequentially to avoid hammering one SMTP server with 100 parallel
  // connections; each item is independent and never throws.
  const data: Array<{ id?: string; error?: { message: string } }> = [];
  for (const item of items) {
    if (!item || typeof item !== "object") {
      data.push({ error: { message: "Each item must be an object." } });
      continue;
    }
    const res = await sendOne(ctx, item as Record<string, unknown>);
    data.push(res.ok ? { id: res.id } : { id: res.id, error: { message: res.message } });
  }

  return NextResponse.json({ data }, { status: 200 });
}
