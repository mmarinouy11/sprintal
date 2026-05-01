import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-route-handler";

/**
 * PKCE OAuth return (Google, etc.): Supabase redirects here with ?code=.
 * Email confirmation with tokens in the hash must use /auth/callback/complete (see signup emailRedirectTo).
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

  const redirectTarget = plan
    ? `${origin}/pricing?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period || "monthly")}`
    : `${origin}/`;

  const response = NextResponse.redirect(redirectTarget);
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth callback: exchangeCodeForSession failed", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
  }
  return response;
}
