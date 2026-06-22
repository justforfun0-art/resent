import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string | null;
};

export type Attachment = {
  filename: string;
  /** Base64-encoded content. */
  content: string;
  contentType?: string;
};

export type DkimSigning = {
  domainName: string;
  keySelector: string;
  privateKey: string;
};

export type SendArgs = {
  from?: string; // optional override; defaults to the config's from address
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: Attachment[];
  dkim?: DkimSigning; // when set, outbound mail is DKIM-signed
};

// Port 465 uses implicit TLS (secure must be true); 587/25 use STARTTLS
// (secure must be false). A mismatch causes "Unexpected socket close", so we
// derive `secure` from the port rather than trusting it blindly.
export function resolveSecure(port: number): boolean {
  return port === 465;
}

function buildTransport(config: SmtpConfig, dkim?: DkimSigning) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: resolveSecure(config.port),
    auth: { user: config.username, pass: config.password },
    ...(dkim
      ? {
          dkim: {
            domainName: dkim.domainName,
            keySelector: dkim.keySelector,
            privateKey: dkim.privateKey,
          },
        }
      : {}),
  });
}

// Open a connection and authenticate without sending — surfaces config errors.
export async function verifyConnection(config: SmtpConfig) {
  await buildTransport(config).verify();
}

// Build a Nodemailer transport from a user's stored SMTP config and send.
export async function sendEmail(config: SmtpConfig, args: SendArgs) {
  const transport = buildTransport(config, args.dkim);

  const defaultFrom = config.from_name
    ? `${config.from_name} <${config.from_email}>`
    : config.from_email;

  const info = await transport.sendMail({
    from: args.from || defaultFrom,
    to: args.to,
    cc: args.cc,
    bcc: args.bcc,
    replyTo: args.replyTo,
    subject: args.subject,
    html: args.html,
    text: args.text,
    headers: args.headers,
    attachments: args.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      encoding: "base64",
      contentType: a.contentType,
    })),
  });

  return { messageId: info.messageId };
}
