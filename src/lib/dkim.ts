// DKIM keypair generation, DNS record formatting, and verification for sending
// domains. Uses Node's crypto (RSA-2048) and dns/promises for verification.

import crypto from "crypto";
import { promises as dns } from "dns";

export type DkimKeys = {
  privateKey: string; // PEM (PKCS#1), used by nodemailer to sign
  publicKey: string; // base64 DER, goes in the DNS TXT record's p= tag
};

// Generate a fresh RSA-2048 DKIM keypair.
export function generateDkimKeys(): DkimKeys {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });
  return {
    privateKey: privateKey as string,
    publicKey: Buffer.from(publicKey as Buffer).toString("base64"),
  };
}

// The DNS records the user must add for a domain. SPF/DMARC are sensible
// defaults; the host names are relative to the domain.
export function dnsRecords(domain: {
  name: string;
  dkim_selector: string;
  dkim_public: string;
}) {
  return [
    {
      type: "TXT",
      host: `${domain.dkim_selector}._domainkey.${domain.name}`,
      value: `v=DKIM1; k=rsa; p=${domain.dkim_public}`,
      purpose: "DKIM (signs your mail)",
    },
    {
      type: "TXT",
      host: domain.name,
      value: "v=spf1 ~all",
      purpose: "SPF (declares allowed senders)",
    },
    {
      type: "TXT",
      host: `_dmarc.${domain.name}`,
      value: "v=DMARC1; p=none;",
      purpose: "DMARC (reporting policy)",
    },
  ];
}

// Verify the DKIM TXT record resolves and contains our public key.
export async function verifyDkim(domain: {
  name: string;
  dkim_selector: string;
  dkim_public: string;
}): Promise<{ ok: boolean; message: string }> {
  const host = `${domain.dkim_selector}._domainkey.${domain.name}`;
  try {
    const records = await dns.resolveTxt(host);
    // Each record is an array of string chunks; join them.
    const flat = records.map((chunks) => chunks.join(""));
    const found = flat.find((r) => r.includes("v=DKIM1"));
    if (!found)
      return { ok: false, message: `No DKIM record found at ${host}.` };
    if (!found.includes(domain.dkim_public))
      return {
        ok: false,
        message: "DKIM record found, but the public key doesn't match.",
      };
    return { ok: true, message: "DKIM verified." };
  } catch {
    return {
      ok: false,
      message: `Couldn't resolve ${host}. DNS may still be propagating.`,
    };
  }
}
