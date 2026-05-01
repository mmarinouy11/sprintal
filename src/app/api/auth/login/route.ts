import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `auth-login:${ip}`, limit: 10, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { userId } = await req.json();
    if (!userId) return apiError("userId requerido.", 400);

    // Get user's org memberships using service_role — bypasses RLS
    const { data: members } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId);

    if (!members?.length) {
      return apiError("No se encontró la organización.", 404);
    }

    // Get all orgs, prefer L1
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("slug, onboarding_complete, cascade_level")
      .in("id", members.map(m => m.org_id))
      .order("cascade_level", { ascending: true });

    const org = orgs?.[0];
    if (!org) return apiError("No se encontró la organización.", 404);

    return apiOk({ slug: org.slug, onboarding_complete: org.onboarding_complete });

  } catch (err) {
    console.error("Login API error:", err);
    return apiError("Error interno.", 500);
  }
}
