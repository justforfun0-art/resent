// Pre-generated ("starter") templates users can add to a client in one click.
// Each is a responsive, email-client-friendly HTML body using {{variable}}
// placeholders that work with renderTemplate(). Kept inline-styled and table-free
// where possible; modern clients handle these well and they stay readable.

export type StarterTemplate = {
  slug: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  /** Sample variables, shown as a hint and prefilled on the Send page. */
  sampleVariables: Record<string, string>;
};

// Shared wrapper so every template shares one clean, centered layout.
function shell(inner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ececf1;">
${inner}
      </div>
      <p style="text-align:center;color:#9a9aa6;font-size:12px;line-height:18px;margin:20px 8px 0;">
        Sent by {{company}} · <a href="{{unsubscribe_url}}" style="color:#9a9aa6;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>`;
}

function button(label: string, urlVar: string): string {
  return `<a href="{{${urlVar}}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">${label}</a>`;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    slug: "welcome",
    name: "Welcome",
    description: "Greet a new user right after sign-up.",
    subject: "Welcome to {{company}}, {{name}} 👋",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      action_url: "https://app.example.com/get-started",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px 36px 12px;">
          <h1 style="margin:0 0 12px;font-size:24px;color:#1a1a24;">Welcome aboard, {{name}}!</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#4a4a57;">
            Thanks for joining {{company}}. We're glad you're here. Let's get your account set up so you can start sending in minutes.
          </p>
          <p style="margin:0 0 28px;">${button("Get started", "action_url")}</p>
          <p style="margin:0;font-size:14px;line-height:22px;color:#7a7a87;">
            Need a hand? Just reply to this email — a real person will read it.
          </p>
        </div>`),
  },
  {
    slug: "verify-email",
    name: "Verify email",
    description: "Confirm a new email address with a code or link.",
    subject: "Confirm your email for {{company}}",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      code: "482913",
      action_url: "https://app.example.com/verify?token=abc",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a24;">Verify your email</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#4a4a57;">
            Hi {{name}}, use the code below to confirm your email address, or tap the button.
          </p>
          <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#1a1a24;background:#f4f4f7;border-radius:10px;text-align:center;padding:16px;margin:0 0 24px;">{{code}}</div>
          <p style="margin:0 0 8px;">${button("Confirm email", "action_url")}</p>
          <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#9a9aa6;">This code expires in 15 minutes. If you didn't request it, ignore this email.</p>
        </div>`),
  },
  {
    slug: "password-reset",
    name: "Password reset",
    description: "Send a secure link to reset a password.",
    subject: "Reset your {{company}} password",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      action_url: "https://app.example.com/reset?token=abc",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a24;">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4a4a57;">
            We got a request to reset the password for {{name}}'s account. Click below to choose a new one.
          </p>
          <p style="margin:0 0 24px;">${button("Reset password", "action_url")}</p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#9a9aa6;">
            This link expires in 1 hour. Didn't ask for this? You can safely ignore this email — your password won't change.
          </p>
        </div>`),
  },
  {
    slug: "magic-link",
    name: "Magic sign-in link",
    description: "Passwordless one-click login link.",
    subject: "Your sign-in link for {{company}}",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      action_url: "https://app.example.com/auth?token=abc",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#1a1a24;">Sign in to {{company}}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4a4a57;">
            Hi {{name}}, click the button below to sign in. No password needed.
          </p>
          <p style="margin:0 0 24px;">${button("Sign in", "action_url")}</p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#9a9aa6;">This link works once and expires in 10 minutes.</p>
        </div>`),
  },
  {
    slug: "receipt",
    name: "Payment receipt",
    description: "Confirm a successful charge with an amount.",
    subject: "Receipt from {{company}} — {{amount}}",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      amount: "$49.00",
      item: "Pro plan (monthly)",
      date: "May 29, 2026",
      action_url: "https://app.example.com/invoices/123",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px;">
          <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#9a9aa6;">Receipt</p>
          <h1 style="margin:0 0 24px;font-size:28px;color:#1a1a24;">{{amount}}</h1>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#4a4a57;margin:0 0 24px;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #ececf1;">Item</td><td style="padding:8px 0;border-bottom:1px solid #ececf1;text-align:right;color:#1a1a24;">{{item}}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #ececf1;">Date</td><td style="padding:8px 0;border-bottom:1px solid #ececf1;text-align:right;color:#1a1a24;">{{date}}</td></tr>
            <tr><td style="padding:8px 0;">Billed to</td><td style="padding:8px 0;text-align:right;color:#1a1a24;">{{name}}</td></tr>
          </table>
          <p style="margin:0;">${button("View invoice", "action_url")}</p>
        </div>`),
  },
  {
    slug: "notification",
    name: "Notification",
    description: "A simple alert about account activity.",
    subject: "{{title}}",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      title: "New sign-in to your account",
      message: "We noticed a sign-in from a new device in San Francisco, CA.",
      action_url: "https://app.example.com/security",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px;">
          <h1 style="margin:0 0 12px;font-size:21px;color:#1a1a24;">{{title}}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4a4a57;">
            Hi {{name}}, {{message}}
          </p>
          <p style="margin:0 0 24px;">${button("Review activity", "action_url")}</p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#9a9aa6;">If this was you, no action is needed.</p>
        </div>`),
  },
  {
    slug: "newsletter",
    name: "Newsletter",
    description: "A clean issue layout with a headline and body.",
    subject: "{{company}} Digest — {{headline}}",
    sampleVariables: {
      name: "Sam",
      company: "Acme",
      headline: "What shipped this month",
      body: "We rolled out multi-client support, a faster send API, and a brand-new dashboard. Here's the rundown.",
      action_url: "https://example.com/blog/changelog",
      unsubscribe_url: "https://example.com/unsubscribe",
    },
    html: shell(`        <div style="padding:36px;">
          <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6366f1;">{{company}} Digest</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:32px;color:#1a1a24;">{{headline}}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4a4a57;">Hi {{name}}, {{body}}</p>
          <p style="margin:0 0 8px;">${button("Read more", "action_url")}</p>
        </div>`),
  },
];
