// Symmetric encryption for SMTP passwords at rest (AES-256-GCM).
//
// Key comes from ENCRYPTION_KEY (64 hex chars = 32 bytes; generate with
// `openssl rand -hex 32`). Ciphertext is stored as iv:tag:data, all hex.
//
// We migrate gradually: rows carry a `password_encrypted` flag. New/updated
// configs are encrypted; legacy plaintext rows still read correctly via
// decryptPassword(), which is a no-op when the flag is false.

import crypto from "crypto";

const ALGO = "aes-256-gcm";

function key(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, "hex");
}

// Whether encryption is configured. When false, we fall back to plaintext
// storage (with the flag set false) so the app keeps working without the key.
export function encryptionEnabled(): boolean {
  return key() !== null;
}

export function encrypt(plaintext: string): string {
  const k = key();
  if (!k) throw new Error("ENCRYPTION_KEY not set");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, k, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const k = key();
  if (!k) throw new Error("ENCRYPTION_KEY not set");
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed ciphertext");
  const decipher = crypto.createDecipheriv(ALGO, k, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ── Convenience for SMTP rows ────────────────────────────────────────────────

// Returns { password, encrypted } ready to persist. Encrypts when a key is
// configured; otherwise stores plaintext and flags it as such.
export function encryptPassword(plain: string): {
  password: string;
  encrypted: boolean;
} {
  if (encryptionEnabled()) return { password: encrypt(plain), encrypted: true };
  return { password: plain, encrypted: false };
}

// Decrypts a stored SMTP password if it was encrypted; otherwise returns it
// unchanged (legacy plaintext rows).
export function decryptPassword(stored: string, encrypted: boolean): string {
  return encrypted ? decrypt(stored) : stored;
}
