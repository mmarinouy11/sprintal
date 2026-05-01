import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PKCE OAuth return (Google, etc.): Supabase redirects here with ?code=.
 * Uses `cookies()` from next/headers so session Set-Cookie is applied to this response
 * (mutating only `NextResponse.redirect` cookies often fails to persist the session).
 * Email confirmation with hash tokens: /auth/callback/complete
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const plan = searchParams.get("plan");
  const period = searchParams.get("period");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    const msg = oauthErrorDescription || oauthError;
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(msg)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/callback/complete`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth callback: exchangeCodeForSession failed", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
  }

  const { data: members, error: membersError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membersError) {
    console.error("auth callback: org_members", membersError.message);
    return NextResponse.redirect(`${origin}/`);
  }

  const hasOrg = Boolean(members?.[0]);

  if (!hasOrg) {
    const qs = new URLSearchParams();
    qs.set("oauth", "true");
    if (plan) qs.set("plan", plan);
    if (period) qs.set("period", period);
    return NextResponse.redirect(`${origin}/auth/signup?${qs.toString()}`);
  }

  if (plan) {
    return NextResponse.redirect(
      `${origin}/pricing?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period || "monthly")}`
    );
  }

  return NextResponse.redirect(`${origin}/`);
}
