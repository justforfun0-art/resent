import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/api-auth";

export const runtime = "nodejs";

// GET /api/v1/emails/:id — retrieve a single email (scoped to the key's client).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  const { db, apiKey } = auth;
  const { id } = await params;

  const { data } = await db
    .from("emails")
    .select(
      "id, from_email, to_emails, cc_emails, bcc_emails, reply_to, subject, html, text, status, scheduled_at, tags, open_count, click_count, opened_at, clicked_at, error, provider_message_id, created_at"
    )
    .eq("id", id)
    .eq("client_id", apiKey.client_id)
    .maybeSingle();

  if (!data)
    return NextResponse.json(
      { error: { message: "Email not found." } },
      { status: 404 }
    );
  return NextResponse.json(data, { status: 200 });
}
