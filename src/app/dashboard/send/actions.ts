"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { sendOne } from "@/lib/send-core";

// Send an email as the logged-in user, from the dashboard Send page.
// Delegates to the shared send pipeline (tracking, suppression, encryption,
// webhooks) using a service-role client.
export async function sendFromDashboard(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated." };

  const client = await getActiveClient();
  if (!client) return { ok: false, message: "No active client." };

  const to = String(formData.get("to") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0) return { ok: false, message: "Add at least one recipient." };

  // Optional variables (JSON) for {{placeholder}} substitution.
  let variables: Record<string, unknown> = {};
  const rawVars = String(formData.get("variables") || "").trim();
  if (rawVars) {
    try {
      variables = JSON.parse(rawVars);
    } catch {
      return { ok: false, message: "Variables must be valid JSON." };
    }
  }

  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const db = createServiceClient();

  const res = await sendOne(
    {
      db,
      userId: user.id,
      clientId: client.id,
      apiKeyId: null,
      baseUrl,
    },
    {
      to,
      subject: String(formData.get("subject") || ""),
      html: String(formData.get("html") || ""),
      variables,
    }
  );

  revalidatePath("/dashboard/emails");
  return res.ok
    ? { ok: true, message: "Sent!" }
    : { ok: false, message: res.message };
}
