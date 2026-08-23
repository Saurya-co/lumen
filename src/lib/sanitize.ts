/**
 * SECURITY-UI: sanitization helpers for untrusted content.
 *
 * Webpage titles, URLs, selected text and AI output are ALL untrusted.
 * They must never inject markup into Lumen's privileged UI. React escapes
 * text by default, but these helpers add defense-in-depth: control-char
 * stripping, length caps, and URL protocol validation before anything is
 * displayed or persisted.
 */

// Strip C0 control chars (except \n \t which we keep for notes), DEL, and
// bidi overrides that could visually spoof Lumen UI text.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Clean arbitrary untrusted text (notes, selections, titles). */
export function sanitizeText(text: unknown, maxLen = 5000): string {
  if (typeof text !== "string") return "";
  return text.replace(UNSAFE_CHARS, "").slice(0, maxLen);
}

/** Clean a page title for display in tabs, switchers and palettes. */
export function sanitizeTitle(title: unknown, maxLen = 200): string {
  const t = sanitizeText(title, maxLen).replace(/\s+/g, " ").trim();
  return t;
}

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "blob:", "file:"]);

/**
 * Validate + clean a URL for display or navigation. Returns "" when the
 * input is not a plausibly safe web/file URL (javascript:, data:, etc.).
 */
export function sanitizeUrl(url: unknown, maxLen = 2048): string {
  if (typeof url !== "string") return "";
  const v = url.slice(0, maxLen);
  // Internal Next.js routes are safe by construction.
  if (v.startsWith("/")) return v.replace(UNSAFE_CHARS, "");
  try {
    const u = new URL(v);
    if (!SAFE_URL_PROTOCOLS.has(u.protocol)) return "";
    return v.replace(UNSAFE_CHARS, "");
  } catch {
    return "";
  }
}
