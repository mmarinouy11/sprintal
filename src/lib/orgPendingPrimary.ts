/** Client-only: remember last saved brand color to smooth over stale reads after refresh. */

export function pendingPrimaryStorageKey(orgId: string) {
  return `sprintal_pending_primary_v1_${orgId}`;
}

export function normalizeHexColor(c: string | undefined | null): string {
  if (!c) return "";
  let s = c.trim().toLowerCase();
  if (!s.startsWith("#")) s = `#${s}`;
  if (s.length === 4) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  return s;
}

type Pending = { hex: string; ts: number };

const MAX_AGE_MS = 3 * 60 * 1000;

export function readPendingPrimary(orgId: string): Pending | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(pendingPrimaryStorageKey(orgId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    if (typeof p.hex !== "string" || typeof p.ts !== "number") return null;
    if (Date.now() - p.ts > MAX_AGE_MS) {
      sessionStorage.removeItem(pendingPrimaryStorageKey(orgId));
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function writePendingPrimary(orgId: string, hex: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      pendingPrimaryStorageKey(orgId),
      JSON.stringify({ hex, ts: Date.now() })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearPendingPrimary(orgId: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(pendingPrimaryStorageKey(orgId));
  } catch {
    /* ignore */
  }
}
