import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/tracking";
import { dispatchWebhooks } from "@/lib/webhooks";

export const runtime = "nodejs";

// GET /api/track/click?e=<emailId>&t=<token>&u=<url> — records a click, then
// redirects to the original destination.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const emailId = params.get("e") || "";
  const token = params.get("t") || "";
  const url = params.get("u") || "";

  // Only redirect to validated http(s) URLs to avoid an open-redirect.
  let safeUrl: string | null = null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      safeUrl = parsed.toString();
    }
  } catch {
    safeUrl = null;
  }

  if (!emailId || !safeUrl || !verifyToken(emailId, url, token)) {
    // Fall back to the destination if it's safe, else home.
    return NextResponse.redirect(safeUrl ?? new URL("/", req.nextUrl.origin));
  }

  const db = createServiceClient();
  const { data: email } = await db
    .from("emails")
    .select("id, client_id, click_count")
    .eq("id", emailId)
    .maybeSingle();

  if (email) {
    const firstClick = (email.click_count ?? 0) === 0;
    await db
      .from("emails")
      .update({
        click_count: (email.click_count ?? 0) + 1,
        clicked_at: firstClick ? new Date().toISOString() : undefined,
      })
      .eq("id", emailId);

    await db.from("email_events").insert({
      email_id: emailId,
      client_id: email.client_id,
      type: "clicked",
      url: safeUrl,
      user_agent: req.headers.get("user-agent"),
    });

    if (email.client_id) {
      await dispatchWebhooks(db, email.client_id, "email.clicked", {
        email_id: emailId,
        url: safeUrl,
      });
    }
  }

  return NextResponse.redirect(safeUrl);
}
