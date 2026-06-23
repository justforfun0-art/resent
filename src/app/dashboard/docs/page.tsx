import Link from "next/link";

export const metadata = {
  title: "Integration Guide — Resent",
  description: "Connect your site or app to Resent and start sending email.",
};

// A self-contained integration guide. Walks a user from creating a client
// through verifying a domain, configuring SMTP, generating an API key, and
// making their first send via the REST API. Pure presentational page — no data
// fetching — so it works for anyone logged in.
export default function DocsPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect your site to Resent
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          A step-by-step guide to wiring your own website or app into Resent so
          you can send transactional and marketing email from your domain. Work
          through the steps in order — each one links to the dashboard page where
          you complete it.
        </p>
      </header>

      <TableOfContents />

      <Step
        n={1}
        id="client"
        title="Pick (or create) a client"
        anchor="Choose the workspace your sends belong to"
      >
        <p>
          A <strong>client</strong> is a sending workspace — its own SMTP
          credentials, domains, API keys, templates, and email logs. Most people
          start with the default client; create a new one per brand or
          environment (e.g. <em>Production</em> vs <em>Staging</em>).
        </p>
        <p>
          Switch or create clients from the workspace switcher at the top of the
          sidebar. Everything below is scoped to the client that is{" "}
          <strong>currently active</strong>, so make sure the right one is
          selected before continuing.
        </p>
        <Callout tone="warn">
          API keys, SMTP config, and verified domains must all live on the{" "}
          <strong>same client</strong>. If your API key resolves to a client
          that has no SMTP config, sends fail with{" "}
          <Code>422 No SMTP configuration set for this client</Code>.
        </Callout>
      </Step>

      <Step
        n={2}
        id="domain"
        title="Add and verify your sending domain"
        anchor="Authenticate your domain with DKIM"
      >
        <p>
          To send from <Code>you@yourdomain.com</Code> with good deliverability,
          authenticate the domain so receiving servers trust your mail.
        </p>
        <ol className="ml-5 list-decimal space-y-2">
          <li>
            Go to{" "}
            <Link href="/dashboard/domains" className="link">
              Domains
            </Link>{" "}
            and add your domain (e.g. <Code>yourdomain.com</Code> or a subdomain
            like <Code>mail.yourdomain.com</Code>).
          </li>
          <li>
            Resent generates a DKIM key pair and shows you the DNS records to
            add. Copy them into your DNS provider (Cloudflare, GoDaddy, Route 53,
            etc.).
          </li>
          <li>
            Add an <strong>SPF</strong> record authorizing your mail provider,
            and (recommended) a <strong>DMARC</strong> record. Example SPF for
            Zoho: <Code>v=spf1 include:zoho.com ~all</Code>.
          </li>
          <li>
            Back on the Domains page, click <strong>Verify</strong>. DNS can take
            a few minutes to propagate. Once verified, mail from this domain is
            DKIM-signed automatically.
          </li>
        </ol>
        <Callout tone="info">
          Verification is optional to <em>send</em>, but unverified domains are
          not DKIM-signed and are far more likely to land in spam.
        </Callout>
      </Step>

      <Step
        n={3}
        id="smtp"
        title="Configure SMTP"
        anchor="Tell Resent how to deliver your mail"
      >
        <p>
          Resent relays your email through an SMTP server you control. Open{" "}
          <Link href="/dashboard/settings" className="link">
            SMTP Settings
          </Link>{" "}
          and enter your provider&rsquo;s details.
        </p>
        <Table
          head={["Field", "Example (Zoho)", "Notes"]}
          rows={[
            ["Host", "smtppro.zoho.in", "Match your provider / data center"],
            ["Port", "465", "465 = implicit TLS; 587 = STARTTLS"],
            ["Username", "you@yourdomain.com", "Full mailbox address"],
            [
              "Password",
              "app-specific password",
              "Use an app password, not your login password",
            ],
            ["From email", "you@yourdomain.com", "Should match a verified domain"],
            ["From name", "Your Company", "Optional display name"],
          ]}
        />
        <p>
          Click <strong>Test connection</strong> first to confirm the
          credentials, then <strong>Save settings</strong>. The password is
          encrypted at rest and never shown again — leave the field blank when
          editing other settings to keep the saved password.
        </p>
      </Step>

      <Step
        n={4}
        id="key"
        title="Create an API key"
        anchor="Generate the credential your app sends with"
      >
        <p>
          Go to{" "}
          <Link href="/dashboard/api-keys" className="link">
            API Keys
          </Link>{" "}
          and create a key. It starts with <Code>rsnt_</Code> and is shown{" "}
          <strong>only once</strong> — copy it immediately and store it as a
          secret in your app (an environment variable, never in client-side
          code or version control).
        </p>
        <Callout tone="warn">
          Treat the key like a password. Anyone with it can send email as you.
          If it leaks, revoke it on the API Keys page and create a new one.
        </Callout>
      </Step>

      <Step
        n={5}
        id="send"
        title="Send your first email"
        anchor="Call the REST API from your backend"
      >
        <p>
          Send a request from your <strong>server</strong> (never the browser —
          that would expose your key) to{" "}
          <Code>POST {"{BASE_URL}"}/api/v1/emails</Code> with your key in the{" "}
          <Code>Authorization</Code> header.
        </p>

        <SubHeading>cURL</SubHeading>
        <Pre>{`curl -X POST "$BASE_URL/api/v1/emails" \\
  -H "Authorization: Bearer rsnt_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Your Company <you@yourdomain.com>",
    "to": ["customer@example.com"],
    "subject": "Welcome aboard!",
    "html": "<h1>Hi there</h1><p>Thanks for signing up.</p>"
  }'`}</Pre>

        <SubHeading>Node.js (fetch)</SubHeading>
        <Pre>{`const res = await fetch(\`\${process.env.RESENT_BASE_URL}/api/v1/emails\`, {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.RESENT_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "Your Company <you@yourdomain.com>",
    to: ["customer@example.com"],
    subject: "Welcome aboard!",
    html: "<h1>Hi there</h1><p>Thanks for signing up.</p>",
  }),
});

const data = await res.json();
if (!res.ok) throw new Error(data.error?.message ?? "Send failed");
console.log("Queued email", data.id);`}</Pre>

        <SubHeading>Python (requests)</SubHeading>
        <Pre>{`import os, requests

res = requests.post(
    f"{os.environ['RESENT_BASE_URL']}/api/v1/emails",
    headers={"Authorization": f"Bearer {os.environ['RESENT_API_KEY']}"},
    json={
        "from": "Your Company <you@yourdomain.com>",
        "to": ["customer@example.com"],
        "subject": "Welcome aboard!",
        "html": "<h1>Hi there</h1><p>Thanks for signing up.</p>",
    },
)
res.raise_for_status()
print("Queued email", res.json()["id"])`}</Pre>

        <p>
          A successful call returns <Code>{`{ "id": "..." }`}</Code>. Watch it
          move through <Code>queued → sent</Code> on the{" "}
          <Link href="/dashboard/emails" className="link">
            Emails
          </Link>{" "}
          page.
        </p>
      </Step>

      <ApiReference />

      <RequestFields />

      <Troubleshooting />

      <footer className="border-t border-white/5 pt-6 text-sm text-neutral-500">
        Still stuck? Check the{" "}
        <Link href="/dashboard/emails" className="link">
          Emails
        </Link>{" "}
        log — failed sends record the exact error there.
      </footer>
    </div>
  );
}

/* ── Building blocks ──────────────────────────────────────────────────────── */

function TableOfContents() {
  const items = [
    ["client", "1. Pick a client"],
    ["domain", "2. Verify your domain"],
    ["smtp", "3. Configure SMTP"],
    ["key", "4. Create an API key"],
    ["send", "5. Send your first email"],
    ["api", "API reference"],
    ["fields", "Request fields"],
    ["troubleshooting", "Troubleshooting"],
  ] as const;
  return (
    <nav className="card flex flex-wrap gap-x-6 gap-y-2 p-5 text-sm">
      {items.map(([id, label]) => (
        <a key={id} href={`#${id}`} className="link">
          {label}
        </a>
      ))}
    </nav>
  );
}

function Step({
  n,
  id,
  title,
  anchor,
  children,
}: {
  n: number;
  id: string;
  title: string;
  anchor: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-sm font-semibold text-black">
          {n}
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-neutral-500">{anchor}</p>
        </div>
      </div>
      <div className="space-y-3 pl-11 text-sm leading-relaxed text-neutral-300">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </h3>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-200">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-4 text-xs leading-relaxed text-neutral-200">
      <code>{children}</code>
    </pre>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "info" | "warn";
  children: React.ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : "border-sky-400/30 bg-sky-400/10 text-sky-200";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-5 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/5">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`px-5 py-3 ${
                    j === 0 ? "font-mono text-neutral-200" : "text-neutral-400"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApiReference() {
  const endpoints = [
    ["POST", "/api/v1/emails", "Send (or schedule) one email"],
    ["POST", "/api/v1/emails/batch", "Send up to 100 emails in one request"],
    ["GET", "/api/v1/emails", "List recent emails (?limit=&status=)"],
    ["GET", "/api/v1/emails/:id", "Retrieve a single email with its status"],
    ["POST", "/api/v1/emails/:id/cancel", "Cancel a still-scheduled email"],
  ];
  return (
    <section id="api" className="scroll-mt-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">API reference</h2>
      <p className="text-sm text-neutral-400">
        Every endpoint requires the{" "}
        <Code>Authorization: Bearer &lt;key&gt;</Code> header and returns JSON.
        The API is Resend-compatible, so most Resend client snippets work by
        pointing the base URL at this app.
      </p>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {endpoints.map(([method, path, desc], i) => (
              <tr key={i} className="border-t border-white/5 first:border-t-0">
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-md border border-indigo-400/30 bg-indigo-400/10 px-2 py-0.5 font-mono text-xs font-medium text-indigo-300">
                    {method}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-neutral-200">{path}</td>
                <td className="px-5 py-3 text-neutral-400">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RequestFields() {
  const rows = [
    ["to", "string | string[]", "Yes", "Recipient address(es)."],
    ["from", "string", "No", "Defaults to your SMTP From. Use \"Name <addr>\"."],
    ["subject", "string", "No*", "Subject line."],
    ["html", "string", "No*", "HTML body. *Provide html, text, or a template."],
    ["text", "string", "No*", "Plain-text body."],
    ["template", "string", "No", "Slug of a saved template."],
    ["variables", "object", "No", "Values for {{placeholders}} in the body."],
    ["cc / bcc", "string | string[]", "No", "Carbon-copy recipients."],
    ["reply_to", "string", "No", "Reply-To address."],
    ["headers", "object", "No", "Custom email headers."],
    ["tags", "object", "No", "Metadata stored with the email."],
    ["attachments", "object[]", "No", "{ filename, content (base64), contentType }."],
    ["scheduled_at", "string (ISO)", "No", "Future time to send instead of now."],
    ["idempotency_key", "string", "No", "Replays return the original result."],
  ];
  return (
    <section id="fields" className="scroll-mt-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Request fields</h2>
      <p className="text-sm text-neutral-400">
        Body fields for <Code>POST /api/v1/emails</Code> (and each item in a
        batch).
      </p>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Field</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Required</th>
              <th className="px-5 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-5 py-3 font-mono text-neutral-200">{r[0]}</td>
                <td className="px-5 py-3 font-mono text-neutral-400">{r[1]}</td>
                <td className="px-5 py-3 text-neutral-400">{r[2]}</td>
                <td className="px-5 py-3 text-neutral-400">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Troubleshooting() {
  const rows = [
    [
      "401 Unauthorized",
      "Missing, wrong, or revoked API key — check the Authorization header.",
    ],
    [
      "422 No SMTP configuration",
      "The key's client has no SMTP config. Set it up under SMTP Settings for the same client.",
    ],
    [
      "422 'to' is required",
      "Add at least one recipient in the to field.",
    ],
    [
      "429 Rate limit exceeded",
      "You're sending too fast. Honor the Retry-After header and slow down.",
    ],
    [
      "502 Send failed",
      "Reached your SMTP server but it rejected the message — see the error on the Emails page (bad credentials, blocked port, unauthorized From).",
    ],
    [
      "500 Internal Server Error",
      "Server misconfiguration (e.g. a missing environment variable). Check your deployment's runtime logs.",
    ],
  ];
  return (
    <section id="troubleshooting" className="scroll-mt-8 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Troubleshooting</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Response</th>
              <th className="px-5 py-3 font-medium">What it means</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-5 py-3 font-mono text-neutral-200">{r[0]}</td>
                <td className="px-5 py-3 text-neutral-400">{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
