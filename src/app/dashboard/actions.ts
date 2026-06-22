"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";
import { resolveSecure, verifyConnection, type SmtpConfig } from "@/lib/mailer";
import {
  getActiveClient,
  getActiveOrgId,
  listClients,
  slugify,
  CLIENT_COLORS,
  ACTIVE_CLIENT_COOKIE,
} from "@/lib/clients";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";
import { encryptPassword } from "@/lib/crypto";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

// Resolve the active client and throw if there isn't one (every scoped action
// needs it). Callers run inside the dashboard, which always has a client.
async function requireClient() {
  const client = await getActiveClient();
  if (!client) throw new Error("No active client");
  return client;
}

// ── Clients (sender workspaces) ───────────────────────────────────────────────
export async function createClientWorkspace(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const existing = await listClients();
  const base = slugify(name);
  // Ensure the slug is unique within the user's workspaces.
  let slug = base;
  let n = 2;
  const taken = new Set(existing.map((c) => c.slug));
  while (taken.has(slug)) slug = `${base}-${n++}`;

  const color = CLIENT_COLORS[existing.length % CLIENT_COLORS.length];
  const orgId = await getActiveOrgId();

  const { data: created, error } = await supabase
    .from("clients")
    .insert({ user_id: user.id, org_id: orgId, name, slug, color })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Switch to the freshly created client.
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLIENT_COOKIE, created.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard", "layout");
}

export async function setActiveClient(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  // Verify ownership before trusting the id.
  const clients = await listClients();
  if (!clients.some((c) => c.id === id)) throw new Error("Unknown client");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLIENT_COOKIE, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard", "layout");
}

export async function deleteClientWorkspace(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const clients = await listClients();
  if (clients.length <= 1) throw new Error("Can't delete your only client");
  if (!clients.some((c) => c.id === id)) throw new Error("Unknown client");

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // If we deleted the active client, fall back to another one.
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value === id) {
    const next = clients.find((c) => c.id !== id);
    if (next)
      cookieStore.set(ACTIVE_CLIENT_COOKIE, next.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
  }
  revalidatePath("/dashboard", "layout");
}

// ── API keys ────────────────────────────────────────────────────────────────
export async function createApiKey(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const name = String(formData.get("name") || "Default");
  const { key, keyPrefix, keyHash } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    client_id: client.id,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/api-keys");
  // Surface the plaintext once (shown then forgotten).
  return key;
}

export async function revokeApiKey(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/api-keys");
}

// ── Templates ─────────────────────────────────────────────────────────────────
export async function upsertTemplate(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const id = String(formData.get("id") || "");
  const row = {
    user_id: user.id,
    client_id: client.id,
    slug: String(formData.get("slug")),
    name: String(formData.get("name")),
    subject: String(formData.get("subject") || ""),
    html: String(formData.get("html") || ""),
  };

  const query = id
    ? supabase.from("templates").update(row).eq("id", id)
    : supabase.from("templates").insert(row);
  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/templates");
}

export async function deleteTemplate(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/templates");
}

// Add a pre-generated starter template to the active client. If the slug is
// already taken in this client, a numeric suffix is appended so it never clobbers
// an existing template.
export async function addStarterTemplate(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const slug = String(formData.get("slug"));

  const starter = STARTER_TEMPLATES.find((t) => t.slug === slug);
  if (!starter) throw new Error("Unknown starter template");

  const { data: existing } = await supabase
    .from("templates")
    .select("slug")
    .eq("client_id", client.id);
  const taken = new Set((existing ?? []).map((r) => r.slug));

  let finalSlug = starter.slug;
  let n = 2;
  while (taken.has(finalSlug)) finalSlug = `${starter.slug}-${n++}`;

  const { error } = await supabase.from("templates").insert({
    user_id: user.id,
    client_id: client.id,
    slug: finalSlug,
    name: starter.name,
    subject: starter.subject,
    html: starter.html,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/templates");
}

// ── Webhooks ──────────────────────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  "email.sent",
  "email.failed",
  "email.opened",
  "email.clicked",
];

export async function createWebhook(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const url = String(formData.get("url") || "").trim();
  if (!/^https?:\/\//.test(url)) throw new Error("Enter a valid http(s) URL");

  const events = WEBHOOK_EVENTS.filter((e) => formData.get(e) === "on");
  if (events.length === 0) throw new Error("Select at least one event");

  // A signing secret the receiver uses to verify the HMAC signature.
  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  const { error } = await supabase.from("webhooks").insert({
    user_id: user.id,
    client_id: client.id,
    url,
    secret,
    events,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/webhooks");
}

export async function toggleWebhook(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const enabled = formData.get("enabled") === "true";
  const { error } = await supabase
    .from("webhooks")
    .update({ enabled: !enabled })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/webhooks");
}

export async function deleteWebhook(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("webhooks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/webhooks");
}

// ── Team (organizations & memberships) ────────────────────────────────────────
export async function inviteMember(formData: FormData) {
  const { supabase } = await requireUser();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("Email is required");
  const role = String(formData.get("role") || "member");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("invitations").upsert(
    { org_id: orgId, email, role, invited_by: user?.id },
    { onConflict: "org_id,email" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export async function revokeInvitation(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export async function changeMemberRole(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  const { error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export async function removeMember(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("memberships").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

// ── Audiences & contacts ──────────────────────────────────────────────────────
export async function createAudience(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");
  const { error } = await supabase
    .from("audiences")
    .insert({ user_id: user.id, client_id: client.id, name });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/audiences");
}

export async function deleteAudience(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("audiences").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/audiences");
}

export async function addContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const audienceId = String(formData.get("audience_id"));
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("Email is required");
  const { error } = await supabase.from("contacts").upsert(
    {
      user_id: user.id,
      audience_id: audienceId,
      email,
      first_name: String(formData.get("first_name") || "").trim() || null,
      last_name: String(formData.get("last_name") || "").trim() || null,
    },
    { onConflict: "audience_id,email" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/audiences/${audienceId}`);
}

export async function removeContact(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const audienceId = String(formData.get("audience_id"));
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/audiences/${audienceId}`);
}

// Bulk-import contacts into an audience from an uploaded Excel/CSV file.
// Recognizes columns by header (case-insensitive): email (required), first_name
// / "first name", last_name / "last name". Existing emails are updated, not
// duplicated. Returns a summary surfaced back to the page.
export async function importContacts(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await requireUser();
  const audienceId = String(formData.get("audience_id"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "Choose a file to upload." };
  if (file.size > 5 * 1024 * 1024)
    return { ok: false, message: "File is too large (max 5 MB)." };

  const { parseContactsFile } = await import("@/lib/contacts-import");
  let rows: { email: string; first_name: string | null; last_name: string | null }[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    rows = parseContactsFile(buf, file.name);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Couldn't read that file.",
    };
  }

  if (rows.length === 0)
    return { ok: false, message: "No rows with a valid 'email' column found." };

  // Upsert in chunks to stay under payload limits.
  const chunkSize = 500;
  let imported = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      user_id: user.id,
      audience_id: audienceId,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
    }));
    const { error } = await supabase
      .from("contacts")
      .upsert(chunk, { onConflict: "audience_id,email" });
    if (error) return { ok: false, message: error.message };
    imported += chunk.length;
  }

  revalidatePath(`/dashboard/audiences/${audienceId}`);
  return { ok: true, message: `Imported ${imported} contact${imported === 1 ? "" : "s"}.` };
}

// ── Broadcasts ────────────────────────────────────────────────────────────────
export async function createBroadcast(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const audienceId = String(formData.get("audience_id"));
  if (!audienceId) throw new Error("Pick an audience");
  const { error } = await supabase.from("broadcasts").insert({
    user_id: user.id,
    client_id: client.id,
    audience_id: audienceId,
    name: String(formData.get("name") || "Untitled"),
    subject: String(formData.get("subject") || ""),
    html: String(formData.get("html") || ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/broadcasts");
}

export async function deleteBroadcast(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("broadcasts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/broadcasts");
}

// Send a broadcast: fan out to every subscribed contact through the shared send
// pipeline (DKIM, tracking, suppression, logging all apply). Per-contact
// {{first_name}}/{{last_name}}/{{email}} variables are available in the body.
export async function sendBroadcast(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const { user } = await requireUser();
  const client = await requireClient();
  const id = String(formData.get("id"));

  // Read via the user-scoped client (RLS confirms ownership).
  const { createClient: createUserClient } = await import("@/lib/supabase/server");
  const userDb = await createUserClient();
  const { data: broadcast } = await userDb
    .from("broadcasts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!broadcast) return { ok: false, message: "Broadcast not found." };
  if (broadcast.status === "sent")
    return { ok: false, message: "Already sent." };

  const { data: contacts } = await userDb
    .from("contacts")
    .select("email, first_name, last_name")
    .eq("audience_id", broadcast.audience_id)
    .eq("unsubscribed", false);
  if (!contacts || contacts.length === 0)
    return { ok: false, message: "Audience has no subscribed contacts." };

  // Switch to the service client for the actual sends.
  const { createServiceClient } = await import("@/lib/supabase/server");
  const { sendOne } = await import("@/lib/send-core");
  const db = createServiceClient();
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  await db.from("broadcasts").update({ status: "sending" }).eq("id", id);

  let sent = 0;
  for (const c of contacts) {
    const res = await sendOne(
      { db, userId: user.id, clientId: client.id, apiKeyId: null, baseUrl },
      {
        to: [c.email],
        subject: broadcast.subject,
        html: broadcast.html,
        variables: {
          email: c.email,
          first_name: c.first_name ?? "",
          last_name: c.last_name ?? "",
        },
        tags: { broadcast_id: id },
      }
    );
    if (res.ok) sent++;
  }

  await db
    .from("broadcasts")
    .update({ status: "sent", sent_count: sent, sent_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard/broadcasts");
  return { ok: true, message: `Sent to ${sent} of ${contacts.length} contacts.` };
}

// ── Domains (DKIM) ────────────────────────────────────────────────────────────
export async function addDomain(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const name = String(formData.get("name") || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name))
    throw new Error("Enter a valid domain, e.g. mail.example.com");

  const { generateDkimKeys } = await import("@/lib/dkim");
  const { privateKey, publicKey } = generateDkimKeys();

  const { error } = await supabase.from("domains").insert({
    user_id: user.id,
    client_id: client.id,
    name,
    dkim_selector: "resent",
    dkim_private: privateKey,
    dkim_public: publicKey,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/domains");
}

export async function verifyDomain(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { data: domain } = await supabase
    .from("domains")
    .select("name, dkim_selector, dkim_public")
    .eq("id", id)
    .maybeSingle();
  if (!domain) return { ok: false, message: "Domain not found." };

  const { verifyDkim } = await import("@/lib/dkim");
  const result = await verifyDkim(domain);
  if (result.ok) {
    await supabase
      .from("domains")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", id);
    revalidatePath("/dashboard/domains");
  }
  return result;
}

export async function deleteDomain(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("domains").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/domains");
}

// ── Suppressions ──────────────────────────────────────────────────────────────
export async function addSuppression(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) throw new Error("Email is required");

  const { error } = await supabase.from("suppressions").upsert(
    {
      user_id: user.id,
      client_id: client.id,
      email,
      reason: String(formData.get("reason") || "manual"),
    },
    { onConflict: "client_id,email" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/suppressions");
}

export async function removeSuppression(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("suppressions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/suppressions");
}

// ── SMTP config ───────────────────────────────────────────────────────────────
function smtpRowFromForm(
  formData: FormData,
  userId: string,
  clientId: string
) {
  const port = Number(formData.get("port") || 587);
  return {
    user_id: userId,
    client_id: clientId,
    host: String(formData.get("host")).trim(),
    port,
    // Derive secure from the port so 465/587 can't be mismatched.
    secure: resolveSecure(port),
    username: String(formData.get("username")).trim(),
    // Gmail app passwords are shown with spaces; strip them.
    password: String(formData.get("password")).replace(/\s+/g, ""),
    from_email: String(formData.get("from_email")).trim(),
    from_name: String(formData.get("from_name") || "").trim() || null,
  };
}

export async function saveSmtpConfig(formData: FormData) {
  const { supabase, user } = await requireUser();
  const client = await requireClient();
  const { password: rawPassword, ...row } = smtpRowFromForm(
    formData,
    user.id,
    client.id
  );

  // A blank password means "keep the existing one" — never overwrite the stored
  // (encrypted) value with an empty string, and never re-encrypt ciphertext.
  // Other fields still update.
  if (!rawPassword) {
    const { data: existing } = await supabase
      .from("smtp_configs")
      .select("id")
      .eq("client_id", client.id)
      .maybeSingle();
    if (!existing)
      throw new Error("Enter a password to save SMTP settings the first time.");
    const { error } = await supabase
      .from("smtp_configs")
      .update(row)
      .eq("client_id", client.id);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/settings");
    return;
  }

  // Encrypt the password at rest when ENCRYPTION_KEY is configured.
  const { password, encrypted } = encryptPassword(rawPassword);
  const { error } = await supabase
    .from("smtp_configs")
    .upsert(
      { ...row, password, password_encrypted: encrypted },
      { onConflict: "client_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

// Test the SMTP credentials without persisting or sending anything.
export async function testSmtpConnection(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const { user } = await requireUser();
  const client = await requireClient();
  const row = smtpRowFromForm(formData, user.id, client.id);
  if (!row.host || !row.username || !row.password) {
    return { ok: false, message: "Fill in host, username, and password first." };
  }
  try {
    await verifyConnection(row as SmtpConfig);
    return { ok: true, message: "Connection OK — credentials accepted." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed.",
    };
  }
}
