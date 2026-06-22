import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendScheduledEmail } from "@/lib/send-core";

export const runtime = "nodejs";

// POST /api/cron/send-scheduled — deliver any emails whose scheduled_at is due.
// Protected by CRON_SECRET (Authorization: Bearer <CRON_SECRET>). Intended to be
// hit every minute by an external scheduler (Supabase pg_cron, Vercel Cron, a
// GitHub Action, etc.). Safe to run concurrently-ish: each row is claimed by
// flipping its status to 'queued' before sending.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 }
    );

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const db = createServiceClient();
  const baseUrl = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");

  // Find a bounded batch of due scheduled emails.
  const { data: due } = await db
    .from("emails")
    .select(
      "id, user_id, client_id, api_key_id, from_email, to_emails, cc_emails, bcc_emails, reply_to, subject, html, text, headers, tags"
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(50);

  let sent = 0;
  let failed = 0;

  for (const row of due ?? []) {
    // Claim the row so a concurrent run won't also send it.
    const { data: claimed } = await db
      .from("emails")
      .update({ status: "queued" })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // someone else claimed it

    const ok = await sendScheduledEmail(db, baseUrl, row);
    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({ processed: (due ?? []).length, sent, failed });
}
