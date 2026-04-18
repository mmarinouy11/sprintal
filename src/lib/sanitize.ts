/**
 * Input sanitization utilities.
 * Strips dangerous characters and enforces length limits.
 */

// Strip HTML tags and dangerous characters
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/[<>'"`;]/g, "")          // strip dangerous chars
    .trim()
    .slice(0, maxLength);
}

// Slug — only lowercase alphanumeric and hyphens
export function sanitizeSlug(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

// Email — basic format validation
export function validateEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase().slice(0, 254);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}

// Color — must be valid hex
export function sanitizeColor(input: unknown): string {
  if (typeof input !== "string") return "#5C6AC4";
  const hex = input.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#5C6AC4";
}

// Integer within range
export function sanitizeInt(input: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(input), 10);
  if (isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Sanitize a full object — apply sanitizeText to all string values
export function sanitizeObject(
  obj: Record<string, unknown>,
  limits: Record<string, number> = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value, limits[key] || 500);
    } else {
      result[key] = value;
    }
  }
  return result;
}
