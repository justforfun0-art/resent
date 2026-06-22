// Open & click tracking for outbound HTML email.
//
// We make tracking self-contained and signed: each tracked URL carries an HMAC
// over the email id (+ destination for clicks), so the public /api/track route
// can trust it without a DB lookup of a secret. Reuses API_KEY_SECRET.

import crypto from "crypto";

function secret(): string {
  return process.env.API_KEY_SECRET || "dev-insecure-secret";
}

// Short HMAC token tying a tracking event to an email (and click target).
export function signToken(emailId: string, url = ""): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${emailId}:${url}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyToken(emailId: string, url: string, token: string): boolean {
  const expected = signToken(emailId, url);
  // Constant-time compare; lengths are fixed so this is safe.
  return (
    token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  );
}

// Inject a tracking pixel before </body> (or append) for open tracking, and
// rewrite http(s) links to route through /api/track for click tracking.
export function instrumentHtml(
  html: string,
  emailId: string,
  baseUrl: string
): string {
  const base = baseUrl.replace(/\/$/, "");

  // Rewrite links: <a href="https://..."> → tracking redirect.
  let out = html.replace(
    /(<a\b[^>]*\bhref=)(["'])(https?:\/\/[^"']+)\2/gi,
    (_m, prefix: string, quote: string, url: string) => {
      const t = signToken(emailId, url);
      const tracked = `${base}/api/track/click?e=${emailId}&t=${t}&u=${encodeURIComponent(
        url
      )}`;
      return `${prefix}${quote}${tracked}${quote}`;
    }
  );

  const pixel = `<img src="${base}/api/track/open?e=${emailId}&t=${signToken(
    emailId
  )}" width="1" height="1" alt="" style="display:none" />`;

  out = /<\/body>/i.test(out)
    ? out.replace(/<\/body>/i, `${pixel}</body>`)
    : out + pixel;

  return out;
}
