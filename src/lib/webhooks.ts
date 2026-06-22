// Outbound webhooks: deliver signed event payloads to user-registered URLs.
// Fired best-effort from the send API and tracking routes via the service-role
// client (it writes across users). Failures are logged, never thrown.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookEvent =
  | "email.sent"
  | "email.failed"
  | "email.opened"
  | "email.clicked";

type WebhookRow = {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
};

// HMAC-SHA256 over the raw JSON body, hex-encoded. Receivers verify with the
// webhook's secret to confirm authenticity.
export function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

// Deliver `event` to every enabled webhook in `clientId` that subscribes to it.
// Runs the deliveries in parallel and records each attempt.
export async function dispatchWebhooks(
  db: SupabaseClient,
  clientId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const { data: hooks } = await db
    .from("webhooks")
    .select("id, url, secret, events, enabled")
    .eq("client_id", clientId)
    .eq("enabled", true);

  const targets = ((hooks as WebhookRow[]) ?? []).filter((h) =>
    h.events.includes(event)
  );
  if (targets.length === 0) return;

  const body = JSON.stringify({
    type: event,
    created_at: new Date().toISOString(),
    data,
  });

  await Promise.all(
    targets.map(async (hook) => {
      const record = {
        webhook_id: hook.id,
        event,
        status_code: null as number | null,
        ok: false,
        error: null as string | null,
      };
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Resent-Event": event,
            "X-Resent-Signature": signPayload(hook.secret, body),
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        record.status_code = res.status;
        record.ok = res.ok;
        if (!res.ok) record.error = `HTTP ${res.status}`;
      } catch (err) {
        record.error = err instanceof Error ? err.message : "delivery failed";
      }
      await db.from("webhook_deliveries").insert(record);
    })
  );
}
