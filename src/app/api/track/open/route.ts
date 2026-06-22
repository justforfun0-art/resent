import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/tracking";
import { dispatchWebhooks } from "@/lib/webhooks";

export const runtime = "nodejs";

// 1×1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixelResponse() {
  return new NextResponse(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Content-Length": String(PIXEL.length),
    },
  });
}

// GET /api/track/open?e=<emailId>&t=<token> — records an open, returns a pixel.
export async function GET(req: NextRequest) {
  const emailId = req.nextUrl.searchParams.get("e") || "";
  const token = req.nextUrl.searchParams.get("t") || "";

  // Always return the pixel, even on bad input — never break the email render.
  if (!emailId || !verifyToken(emailId, "", token)) return pixelResponse();

  const db = createServiceClient();
  const { data: email } = await db
    .from("emails")
    .select("id, client_id, open_count")
    .eq("id", emailId)
    .maybeSingle();

  if (email) {
    const firstOpen = (email.open_count ?? 0) === 0;
    await db
      .from("emails")
      .update({
        open_count: (email.open_count ?? 0) + 1,
        opened_at: firstOpen ? new Date().toISOString() : undefined,
      })
      .eq("id", emailId);

    await db.from("email_events").insert({
      email_id: emailId,
      client_id: email.client_id,
      type: "opened",
      user_agent: req.headers.get("user-agent"),
    });

    if (firstOpen && email.client_id) {
      await dispatchWebhooks(db, email.client_id, "email.opened", {
        email_id: emailId,
      });
    }
  }

  return pixelResponse();
}
