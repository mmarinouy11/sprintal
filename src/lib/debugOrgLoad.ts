/**
 * Opt-in org/load troubleshooting. Does nothing unless enabled.
 *
 * Enable:
 * - Add `?__sprintal_debug=1` to the URL (persists for the tab via sessionStorage), or
 * - Set env `NEXT_PUBLIC_SPRINTAL_DEBUG=1` (always on in that build).
 *
 * Open DevTools → Console and filter by `[sprintal:org`.
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
        "[sprintal:org] Debug logging ON for this tab (sessionStorage). Clear with: sessionStorage.removeItem('sprintal_org_debug')"
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
