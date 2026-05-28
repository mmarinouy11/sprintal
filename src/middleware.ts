import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { selectHomeOrgFromCandidates, type HomeOrgCandidate } from "@/lib/pickHomeOrg";

/**
 * Refreshes Supabase auth cookies on navigation so Server Components see a valid session.
 * Without this, JWT expiry / cookie sync issues look like random logouts (especially on full page loads to `/`).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname === "/" && user) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: memberships } = await supabaseAdmin
      .from("org_members")
      .select("org_id, organizations(slug, onboarding_complete, cascade_level, parent_org_id)")
      .eq("user_id", user.id)
      .limit(200);

    const candidates: HomeOrgCandidate[] = ((memberships ?? []) as Array<{
      org_id: string;
      organizations:
        | {
            slug: string | null;
            onboarding_complete: boolean | null;
            cascade_level: number | null;
            parent_org_id: string | null;
          }
        | Array<{
            slug: string | null;
            onboarding_complete: boolean | null;
            cascade_level: number | null;
            parent_org_id: string | null;
          }>
        | null;
    }>)
      .map((m) => {
        const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        if (!org?.slug) return null;
        return {
          orgId: m.org_id,
          slug: org.slug,
          onboarding_complete: !!org.onboarding_complete,
          cascade_level: org.cascade_level ?? 0,
          parent_org_id: org.parent_org_id ?? null,
        };
      })
      .filter((candidate): candidate is HomeOrgCandidate => candidate != null);

    if (candidates.length) {
      const orgIdFromUrl = request.nextUrl.searchParams.get("orgId");
      const home = selectHomeOrgFromCandidates(candidates, user.user_metadata?.invited_to_org, orgIdFromUrl);
      if (home) {
        const target = home.onboarding_complete ? `/${home.slug}/dashboard` : `/onboarding/${home.slug}`;
        return NextResponse.redirect(new URL(target, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
