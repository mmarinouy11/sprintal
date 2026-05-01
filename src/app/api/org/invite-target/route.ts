import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * After accepting an email invite, the browser has a valid session but RLS on
 * org_members may still block the server-rendered `/` page. This route uses the
 * service role to resolve the org slug for the invited orgId so we can redirect
 * straight into the app (same pattern as /api/org/data).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `invite-target:${ip}`, limit: 60, windowMs: 60 * 1000 });
  if (!allowed) {
    return apiError("Too many requests.", 429);
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return apiError("Unauthorized", 401);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return apiError("Unauthorized", 401);

    const orgId = req.nextUrl.searchParams.get("orgId")?.trim();
    if (!orgId) return apiError("orgId required", 400);

    const { data: member, error: memError } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (memError || !member) {
      return apiError("Not a member of this organization.", 403);
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("slug, onboarding_complete")
      .eq("id", orgId)
      .maybeSingle();

    if (orgError || !org?.slug) {
      return apiError("Organization not found.", 404);
    }

    return apiOk({
      slug: org.slug,
      onboarding_complete: !!org.onboarding_complete,
    });
  } catch (e) {
    console.error("invite-target error:", e);
    return apiError("Server error", 500);
  }
}
