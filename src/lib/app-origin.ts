/**
 * Canonical browser origin for OAuth redirects and links.
 * Set NEXT_PUBLIC_APP_URL=https://sprintal.vercel.app in Vercel so redirectTo matches
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs exactly.
 */
export function getBrowserAppOrigin(): string {
  if (typeof window === "undefined") return "";
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return window.location.origin;
}
