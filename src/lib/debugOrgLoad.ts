/**
 * Opt-in troubleshooting (org layout, auth redirects, invite flow).
 *
 * **Browser:** add `?__sprintal_debug=1` (persists for the tab via sessionStorage), or set
 * `NEXT_PUBLIC_SPRINTAL_DEBUG=1`. Console filter: `[sprintal:org` or `[sprintal:auth`.
 *
 * **Server (API routes, optional root page):** set `SPRINTAL_DEBUG=1` or
 * `NEXT_PUBLIC_SPRINTAL_DEBUG=1` in Vercel — logs appear in function logs, prefix `[sprintal:api`.
 */

const SESSION_KEY = "sprintal_org_debug";

function readEnvDebug(): boolean {
  return process.env.NEXT_PUBLIC_SPRINTAL_DEBUG === "1";
}

export function isOrgLoadDebugEnabled(): boolean {
  if (readEnvDebug()) return true;
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return true;
    const q = new URLSearchParams(window.location.search).get("__sprintal_debug");
    if (q === "1" || q === "true") {
      sessionStorage.setItem(SESSION_KEY, "1");
      // eslint-disable-next-line no-console -- debug helper
      console.info(
        "[sprintal] Debug ON (org + auth client logs). Clear: sessionStorage.removeItem('sprintal_org_debug')"
      );
      return true;
    }
  } catch {
    /* private mode / blocked storage */
  }
  return false;
}

export function orgLoadDebug(message: string, data?: Record<string, unknown>): void {
  if (!isOrgLoadDebugEnabled()) return;
  const ts = new Date().toISOString();
  const prefix = `[sprintal:org ${ts}] ${message}`;
  if (data !== undefined) {
    // eslint-disable-next-line no-console -- debug helper
    console.log(prefix, data);
  } else {
    // eslint-disable-next-line no-console -- debug helper
    console.log(prefix);
  }
}

/** Same opt-in as org load (`__sprintal_debug` / NEXT_PUBLIC_SPRINTAL_DEBUG). Client only. */
export function sprintalAuthDebug(message: string, data?: Record<string, unknown>): void {
  if (!isOrgLoadDebugEnabled()) return;
  const ts = new Date().toISOString();
  const prefix = `[sprintal:auth ${ts}] ${message}`;
  if (data !== undefined) {
    // eslint-disable-next-line no-console -- debug helper
    console.log(prefix, data);
  } else {
    // eslint-disable-next-line no-console -- debug helper
    console.log(prefix);
  }
}

/** Server-side logs (Vercel / terminal). No secrets — avoid logging tokens. */
export function isSprintalServerDebug(): boolean {
  return (
    process.env.SPRINTAL_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_SPRINTAL_DEBUG === "1"
  );
}

export function sprintalServerDebug(
  scope: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isSprintalServerDebug()) return;
  const ts = new Date().toISOString();
  const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  // eslint-disable-next-line no-console -- debug helper
  console.log(`[sprintal:${scope} ${ts}] ${message}${suffix}`);
}

/** Short uuid prefix for logs (no PII). */
export function sprintalShortId(id: string | null | undefined): string {
  if (!id) return "(none)";
  const s = String(id).trim();
  if (s.length <= 8) return s;
  return `${s.slice(0, 8)}…`;
}
