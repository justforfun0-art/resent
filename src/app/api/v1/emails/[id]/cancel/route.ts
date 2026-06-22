import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/api-auth";

export const runtime = "nodejs";

// POST /api/v1/emails/:id/cancel — cancel a scheduled email before it sends.
// Only emails still in 'scheduled' status can be cancelled.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  const { db, apiKey } = auth;
  const { id } = await params;

  // Atomic guard: only flips if it's still scheduled and owned by this client.
  const { data } = await db
    .from("emails")
    .update({ status: "canceled" })
    .eq("id", id)
    .eq("client_id", apiKey.client_id)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (!data)
    return NextResponse.json(
      { error: { message: "Email not found or not cancelable." } },
      { status: 422 }
    );
  return NextResponse.json({ id, status: "canceled" }, { status: 200 });
}
