// Parse an uploaded Excel (.xlsx/.xls) or CSV file into contact rows.
// Columns are matched by header, case-insensitively, with a few aliases:
//   email      ← email, e-mail, email address
//   first_name ← first_name, first name, firstname, first
//   last_name  ← last_name, last name, lastname, last
// Rows without a syntactically valid email are skipped.

import * as XLSX from "xlsx";

export type ParsedContact = {
  email: string;
  first_name: string | null;
  last_name: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(h: string): "email" | "first_name" | "last_name" | null {
  const k = h.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["email", "e_mail", "email_address"].includes(k)) return "email";
  if (["first_name", "firstname", "first", "given_name"].includes(k))
    return "first_name";
  if (["last_name", "lastname", "last", "surname", "family_name"].includes(k))
    return "last_name";
  return null;
}

// Parse a file buffer (xlsx/xls/csv) into deduped, validated contact rows.
export function parseContactsFile(buf: Buffer, filename: string): ParsedContact[] {
  // SheetJS reads xlsx, xls, and csv from a buffer transparently.
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("The file has no sheets.");
  const sheet = wb.Sheets[sheetName];

  // header:1 → array-of-arrays so we control header mapping ourselves.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (rows.length < 1) throw new Error(`"${filename}" looks empty.`);

  // First non-empty row is the header.
  const headerRow = (rows[0] as unknown[]).map((c) => String(c ?? ""));
  const colMap = headerRow.map(normalizeHeader);
  const emailCol = colMap.indexOf("email");
  if (emailCol === -1)
    throw new Error("No 'email' column found in the header row.");
  const firstCol = colMap.indexOf("first_name");
  const lastCol = colMap.indexOf("last_name");

  const seen = new Set<string>();
  const out: ParsedContact[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const email = String(row[emailCol] ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      first_name: firstCol >= 0 ? String(row[firstCol] ?? "").trim() || null : null,
      last_name: lastCol >= 0 ? String(row[lastCol] ?? "").trim() || null : null,
    });
  }
  return out;
}
