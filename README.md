# Resent

A self-hosted email sending platform — a Resend *alternative*. It does **not** use
the Resend API; email is delivered through **your own SMTP server** via Nodemailer.

## Features

- **Auth** — email/password via Supabase Auth, every row scoped per user with RLS.
- **Clients (sender workspaces)** — one account manages several clients, each with
  its own SMTP backend, API keys, templates and send log. Switch between them from
  the sidebar; everything is scoped to the active client.
- **API keys** — generate/revoke keys; only an HMAC is stored, plaintext shown once.
- **Send API** — `POST /api/v1/emails`, Resend-compatible request/response shape.
- **Templates** — reusable bodies with `{{variable}}` substitution.
- **Dashboard** — send a test, browse the email log, manage keys, templates, SMTP.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (Postgres + Auth) · Nodemailer.

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com/dashboard), then run the
migrations in order (SQL editor, or `supabase db push`):

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_clients.sql` — adds the `clients` table and scopes
   SMTP / keys / templates / emails per client. It auto-creates a "Default"
   client for any existing data, so it's safe to run on a populated database.
3. `supabase/migrations/0003_tier1.sql` — adds reply-to / headers / tags /
   idempotency / open-click tracking columns plus `email_events`, `webhooks`,
   and `webhook_deliveries` tables.
4. `supabase/migrations/0004_tier2.sql` — adds the `suppressions` table, a
   `scheduled_at` column for scheduled sends, and a `password_encrypted` flag on
   `smtp_configs`.
5. `supabase/migrations/0005_rate_limits.sql` — per-key rate limiting.
6. `supabase/migrations/0006_domains.sql` — sending domains + DKIM keys.
7. `supabase/migrations/0007_audiences.sql` — audiences, contacts, broadcasts.
8. `supabase/migrations/0008_teams.sql` — organizations, memberships, invitations
   (backfills a personal org per existing owner).
9. `supabase/migrations/0009_team_access.sql` — broadens RLS so org members can
   access their org's client-scoped rows.
10. `supabase/migrations/0010_team_rls_hardening.sql` — tightens team-write RLS.

### 2. Environment

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (service_role — secret) |
| `API_KEY_SECRET` | `openssl rand -hex 32` |

### 3. Run

```bash
npm run dev      # http://localhost:3000
```

Sign up, set your SMTP settings, create an API key, and send.

## Send API

```bash
curl -X POST http://localhost:3000/api/v1/emails \
  -H "Authorization: Bearer rsnt_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["someone@example.com"],
    "subject": "Hello {{name}}",
    "html": "<h1>Hi {{name}}</h1>",
    "variables": { "name": "Sam" }
  }'
```

Using a saved template instead of inline content:

```json
{ "to": ["someone@example.com"], "template": "welcome", "variables": { "name": "Sam" } }
```

**Body fields:** `from?`, `to`, `cc?`, `bcc?`, `reply_to?`, `subject?`, `html?`,
`text?`, `template?` (slug), `variables?`, `headers?` (object), `tags?` (object),
`attachments?` (`[{ filename, content (base64), contentType? }]`),
`idempotency_key?`. Returns `{ "id": "<email-id>" }` on success.

**Idempotency.** Send `Idempotency-Key: <unique>` (header) or `idempotency_key`
(body). A retried request with the same key + API key returns the original
`{ id, idempotent: true }` instead of sending again.

**Open & click tracking.** HTML emails are automatically instrumented with a
tracking pixel and rewritten links (routed through `/api/track`). Opens and
clicks show up per-email in the dashboard. Set `APP_URL` so links are absolute.

**Templates & escaping.** `{{var}}` is HTML-escaped (safe for user input);
`{{{var}}}` injects raw HTML when you intend markup.

**Webhooks.** Register endpoints under **Webhooks** to receive `email.sent`,
`email.failed`, `email.opened`, and `email.clicked` events. Payloads are signed
with `X-Resent-Signature` (HMAC-SHA256 of the body using the webhook's secret).

**Batch.** `POST /api/v1/emails/batch` with an array (or `{ emails: [...] }`) of
up to 100 of the same objects. Returns `{ data: [{ id }|{ error }], ... }` in
order — one result per item.

**Scheduled sends.** Pass `scheduled_at` (ISO timestamp, future) to defer; the
email is logged as `scheduled`. A worker endpoint drains due emails:
`POST /api/cron/send-scheduled` with `Authorization: Bearer <CRON_SECRET>`. Wire
it to a scheduler (Supabase pg_cron, Vercel Cron, a GitHub Action) to run every
minute.

**Suppressions.** Manage a per-client block list under **Suppressions**. A send
to any suppressed recipient is logged as `suppressed` and skipped.

**List / retrieve / cancel.** `GET /api/v1/emails?limit=&status=` lists, `GET
/api/v1/emails/:id` retrieves, `POST /api/v1/emails/:id/cancel` cancels a
scheduled send. Send endpoints are rate-limited per key (`RATE_LIMIT_PER_SECOND`,
default 10) → `429` with `Retry-After`.

**Domains + DKIM.** Add a sending domain under **Domains**, add the shown DNS
records (DKIM/SPF/DMARC), and verify. Mail sent from a verified domain is
DKIM-signed automatically.

**Audiences + Broadcasts.** Build contact lists under **Audiences**, then send a
**Broadcast** to one — it fans out through the same send pipeline (DKIM,
tracking, suppression all apply), with `{{first_name}}`/`{{email}}` per contact.

**Team.** Invite teammates under **Team** (owner / admin / member). Org members
share access to all of the org's clients; an invite is accepted by signing in
with the invited email.

## Notes

- Set `ENCRYPTION_KEY` (`openssl rand -hex 32`) to encrypt SMTP passwords at rest
  (AES-256-GCM). Without it, passwords are stored as plaintext, flagged as such,
  and the app still works — so set it in production.

- API keys are HMAC-hashed with `API_KEY_SECRET`; rotating the secret invalidates
  all existing keys.
- The send API runs on the Node.js runtime (Nodemailer needs Node, not Edge).
- SMTP passwords are stored in the database. For production, consider encrypting
  them at rest or using a secrets manager.
