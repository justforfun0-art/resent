// Shared send pipeline used by the single-send API, the batch API, and the
// scheduled-send worker. Operates on a service-role client (writes across users).
//
// Responsibilities: validate, render templates, honor the suppression list,
// decrypt SMTP, instrument tracking, log to `emails`, send, update status, and
// dispatch webhooks. Idempotency is handled by callers before calling here.

import type { SupabaseClient } from "@supabase/supabase-js";
import { renderTemplate } from "@/lib/template";
import {
  sendEmail,
  type SmtpConfig,
  type Attachment,
  type DkimSigning,
} from "@/lib/mailer";
import { decryptPassword } from "@/lib/crypto";
import { instrumentHtml } from "@/lib/tracking";
import { dispatchWebhooks } from "@/lib/webhooks";

function toArray(v: unknown): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

// Pull the bare address out of a `Name <addr@host>` or plain `addr@host` string.
function extractEmail(from?: string): string | undefined {
  if (!from) return undefined;
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}

export function parseAttachments(v: unknown): Attachment[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Attachment[] = [];
  for (const a of v) {
    if (a && typeof a === "object") {
      const o = a as Record<string, unknown>;
      if (typeof o.filename === "string" && typeof o.content === "string") {
        out.push({
          filename: o.filename,
          content: o.content,
          contentType:
            typeof o.contentType === "string" ? o.contentType : undefined,
        });
      }
    }
  }
  return out.length ? out : undefined;
}

export type SendContext = {
  db: SupabaseClient;
  userId: string;
  clientId: string;
  apiKeyId?: string | null;
  baseUrl: string;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; id?: string; status: number; message: string };

// Decrypt + verify a client's stored SMTP config into the mailer's shape.
async function loadSmtp(
  db: SupabaseClient,
  clientId: string
): Promise<SmtpConfig | null> {
  const { data } = await db
    .from("smtp_configs")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data) return null;
  return {
    host: data.host,
    port: data.port,
    secure: data.secure,
    username: data.username,
    password: decryptPassword(data.password, data.password_encrypted ?? false),
    from_email: data.from_email,
    from_name: data.from_name,
  };
}

// Find a verified DKIM domain for the From address. The domain part of the
// from-email must match (or be a subdomain of) a verified domain in this client.
async function loadDkim(
  db: SupabaseClient,
  clientId: string,
  fromEmail: string
): Promise<DkimSigning | undefined> {
  const at = fromEmail.lastIndexOf("@");
  if (at < 0) return undefined;
  const fromDomain = fromEmail.slice(at + 1).toLowerCase();

  const { data: domains } = await db
    .from("domains")
    .select("name, dkim_selector, dkim_private")
    .eq("client_id", clientId)
    .eq("verified", true);

  const match = (domains ?? []).find((d) => {
    const n = d.name.toLowerCase();
    return fromDomain === n || fromDomain.endsWith(`.${n}`);
  });
  if (!match) return undefined;

  return {
    domainName: match.name,
    keySelector: match.dkim_selector,
    privateKey: match.dkim_private,
  };
}

// Send (or schedule) a single email described by `body`. When body.scheduled_at
// is a future time, the email is logged as 'scheduled' and NOT sent — the worker
// picks it up later via sendScheduledEmail().
export async function sendOne(
  ctx: SendContext,
  body: Record<string, unknown>,
  opts: { idempotencyKey?: string | null } = {}
): Promise<SendResult> {
  const { db, clientId } = ctx;

  const to = toArray(body.to);
  if (to.length === 0)
    return { ok: false, status: 422, message: "'to' is required." };

  const variables = (body.variables as Record<string, unknown>) || {};
  let subject = typeof body.subject === "string" ? body.subject : "";
  let html = typeof body.html === "string" ? body.html : undefined;
  const text = typeof body.text === "string" ? body.text : undefined;
  let templateId: string | null = null;

  if (typeof body.template === "string" && body.template) {
    const { data: tpl } = await db
      .from("templates")
      .select("id, subject, html")
      .eq("client_id", clientId)
      .eq("slug", body.template)
      .maybeSingle();
    if (!tpl)
      return {
        ok: false,
        status: 422,
        message: `Template '${body.template}' not found.`,
      };
    templateId = tpl.id;
    subject = renderTemplate(subject || tpl.subject, variables);
    html = renderTemplate(html ?? tpl.html, variables);
  } else {
    subject = renderTemplate(subject, variables);
    if (html) html = renderTemplate(html, variables);
  }

  if (!html && !text)
    return {
      ok: false,
      status: 422,
      message: "Provide 'html', 'text', or a 'template'.",
    };

  const smtp = await loadSmtp(db, clientId);
  if (!smtp)
    return {
      ok: false,
      status: 422,
      message: "No SMTP configuration set for this client.",
    };

  const cc = toArray(body.cc);
  const bcc = toArray(body.bcc);
  const from = typeof body.from === "string" ? body.from : undefined;
  const replyTo =
    typeof body.reply_to === "string"
      ? body.reply_to
      : typeof body.replyTo === "string"
        ? body.replyTo
        : undefined;
  const headers =
    body.headers && typeof body.headers === "object"
      ? (body.headers as Record<string, string>)
      : undefined;
  const tags =
    body.tags && typeof body.tags === "object" ? body.tags : undefined;
  const attachments = parseAttachments(body.attachments);

  // Suppression check: any recipient on the list blocks the whole send.
  const recipients = [...to, ...cc, ...bcc];
  const { data: suppressed } = await db
    .from("suppressions")
    .select("email")
    .eq("client_id", clientId)
    .in("email", recipients);

  // Scheduling: if scheduled_at is a valid future time, log and defer.
  let scheduledAt: string | null = null;
  if (typeof body.scheduled_at === "string") {
    const t = new Date(body.scheduled_at);
    if (!isNaN(t.getTime()) && t.getTime() > Date.now())
      scheduledAt = t.toISOString();
  }

  const isSuppressed = (suppressed ?? []).length > 0;
  const initialStatus = isSuppressed
    ? "suppressed"
    : scheduledAt
      ? "scheduled"
      : "queued";

  const { data: logged } = await db
    .from("emails")
    .insert({
      user_id: ctx.userId,
      client_id: clientId,
      api_key_id: ctx.apiKeyId ?? null,
      from_email: from || smtp.from_email,
      to_emails: to,
      cc_emails: cc.length ? cc : null,
      bcc_emails: bcc.length ? bcc : null,
      reply_to: replyTo ?? null,
      subject,
      html: html ?? null,
      text: text ?? null,
      headers: headers ?? null,
      tags: tags ?? null,
      idempotency_key: opts.idempotencyKey ?? null,
      template_id: templateId,
      scheduled_at: scheduledAt,
      status: initialStatus,
      error: isSuppressed ? "Recipient is on the suppression list." : null,
    })
    .select("id")
    .single();

  const emailId = logged?.id as string;

  if (isSuppressed)
    return {
      ok: false,
      id: emailId,
      status: 422,
      message: "Recipient is on the suppression list.",
    };

  // Deferred: don't send now; the worker will call sendScheduledEmail().
  if (scheduledAt) return { ok: true, id: emailId };

  return deliver(ctx, emailId, smtp, {
    from,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    html,
    text,
    headers,
    attachments,
    tags,
  });
}

type DeliverArgs = {
  from?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: Attachment[];
  tags?: unknown;
};

// Perform the actual SMTP send for an already-logged email, update status, and
// fire webhooks. Shared by sendOne (immediate) and the scheduled worker.
async function deliver(
  ctx: SendContext,
  emailId: string,
  smtp: SmtpConfig,
  a: DeliverArgs
): Promise<SendResult> {
  const { db, clientId } = ctx;
  const trackedHtml = a.html
    ? instrumentHtml(a.html, emailId, ctx.baseUrl)
    : undefined;

  // DKIM-sign if the From domain has a verified domain in this client.
  const fromEmail = extractEmail(a.from) || smtp.from_email;
  const dkim = await loadDkim(db, clientId, fromEmail);

  try {
    const { messageId } = await sendEmail(smtp, {
      from: a.from,
      to: a.to,
      cc: a.cc.length ? a.cc : undefined,
      bcc: a.bcc.length ? a.bcc : undefined,
      replyTo: a.replyTo,
      subject: a.subject,
      html: trackedHtml,
      text: a.text,
      dkim,
      headers: a.headers,
      attachments: a.attachments,
    });

    await db
      .from("emails")
      .update({ status: "sent", provider_message_id: messageId })
      .eq("id", emailId);

    if (ctx.apiKeyId)
      await db
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", ctx.apiKeyId);

    await dispatchWebhooks(db, clientId, "email.sent", {
      email_id: emailId,
      to: a.to,
      subject: a.subject,
      tags: a.tags ?? null,
    });
    return { ok: true, id: emailId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed.";
    await db
      .from("emails")
      .update({ status: "failed", error: message })
      .eq("id", emailId);
    await dispatchWebhooks(db, clientId, "email.failed", {
      email_id: emailId,
      to: a.to,
      subject: a.subject,
      error: message,
    });
    return { ok: false, id: emailId, status: 502, message };
  }
}

// Send a single already-logged 'scheduled' email now (used by the worker).
// Re-reads the row, decrypts SMTP, and delivers. Returns true on success.
export async function sendScheduledEmail(
  db: SupabaseClient,
  baseUrl: string,
  row: {
    id: string;
    user_id: string;
    client_id: string;
    api_key_id: string | null;
    from_email: string;
    to_emails: string[];
    cc_emails: string[] | null;
    bcc_emails: string[] | null;
    reply_to: string | null;
    subject: string;
    html: string | null;
    text: string | null;
    headers: Record<string, string> | null;
    tags: unknown;
  }
): Promise<boolean> {
  const smtp = await loadSmtp(db, row.client_id);
  if (!smtp) {
    await db
      .from("emails")
      .update({ status: "failed", error: "No SMTP configuration." })
      .eq("id", row.id);
    return false;
  }

  const ctx: SendContext = {
    db,
    userId: row.user_id,
    clientId: row.client_id,
    apiKeyId: row.api_key_id,
    baseUrl,
  };

  const res = await deliver(ctx, row.id, smtp, {
    from: row.from_email,
    to: row.to_emails,
    cc: row.cc_emails ?? [],
    bcc: row.bcc_emails ?? [],
    replyTo: row.reply_to ?? undefined,
    subject: row.subject,
    html: row.html ?? undefined,
    text: row.text ?? undefined,
    headers: row.headers ?? undefined,
    tags: row.tags,
  });
  return res.ok;
}
