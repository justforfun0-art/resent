// {{variable}} substitution with HTML escaping by default.
//
//   {{name}}    → value, HTML-escaped (safe to drop into markup)
//   {{{name}}}  → value, raw / unescaped (opt-in, for trusted HTML fragments)
//
// Escaping by default prevents injection when variables come from end users
// (e.g. a name like `<script>`), while the triple-brace form preserves the old
// behavior for cases where the value is intentionally HTML.
//
// Missing variables render as empty string. Dotted paths (a.b.c) are supported.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lookup(name: string, variables: Record<string, unknown>): unknown {
  return name.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, variables);
}

export function renderTemplate(
  input: string,
  variables: Record<string, unknown> = {}
): string {
  // Triple braces first (raw), then double braces (escaped). Order matters so
  // the double-brace pass doesn't partially consume a triple-brace token.
  return input
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, name: string) => {
      const value = lookup(name, variables);
      return value == null ? "" : String(value);
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
      const value = lookup(name, variables);
      return value == null ? "" : escapeHtml(String(value));
    });
}
