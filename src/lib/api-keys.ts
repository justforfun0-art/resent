import { createHmac, randomBytes } from "crypto";

const PREFIX = "rsnt_";

// Generate a new plaintext API key. Returned once; we persist only its hash.
export function generateApiKey() {
  const raw = randomBytes(24).toString("base64url");
  const key = `${PREFIX}${raw}`;
  return {
    key,
    keyPrefix: key.slice(0, 10), // e.g. "rsnt_AbCd" — for display/identification
    keyHash: hashApiKey(key),
  };
}

// Deterministic HMAC so we can look a presented key up by its hash.
export function hashApiKey(key: string) {
  return createHmac("sha256", process.env.API_KEY_SECRET!)
    .update(key)
    .digest("hex");
}
