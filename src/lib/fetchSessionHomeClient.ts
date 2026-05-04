/**
 * Browser: resolve dashboard org the same way as `/` and layout recovery — via
 * `/api/org/session-home` (service role membership list + invited_to_org).
 * Avoids RLS hiding org_members rows in the anon Supabase client.
 */
export type SessionHomeOk = {
  ok: true;
  slug: string;
  onboarding_complete: boolean;
  orgId: string;
};

export type SessionHomeErr = { ok: false; status: number };

export type SessionHomeResult = SessionHomeOk | SessionHomeErr;

export async function fetchSessionHomeClient(accessToken: string): Promise<SessionHomeResult> {
  const res = await fetch(`/api/org/session-home?_ts=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const body = (await res.json()) as {
    slug?: string;
    onboarding_complete?: boolean;
    orgId?: string;
  };
  if (!body.slug || !body.orgId) {
    return { ok: false, status: 500 };
  }
  return {
    ok: true,
    slug: body.slug,
    onboarding_complete: !!body.onboarding_complete,
    orgId: body.orgId,
  };
}
