import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText, validateEmail } from "@/lib/sanitize";
import { apiError, apiOk } from "@/lib/api-response";

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48);
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per hour
  const ip = getClientIp(req);
  const { allowed, resetAt } = rateLimit({ key: `signup:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return apiError("Demasiados intentos. Intentá de nuevo más tarde.", 429, {
      "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
    });
  }

  // Create fresh client per request — avoids stale cache in serverless
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();
    const userId = body.userId?.trim();
    const email = validateEmail(body.email);
    const orgName = sanitizeText(body.orgName, 100);

    if (!userId || !orgName) {
      return apiError("Nombre de organización requerido.", 400);
    }
    if (!email) {
      return apiError("Email inválido.", 400);
    }

    // Verify user exists in Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      return apiError("Usuario no encontrado.", 404);
    }

    // Check if org already exists for this user (avoid duplicates)
    const { data: existingMember } = await supabaseAdmin
      .from("org_members").select("org_id").eq("user_id", userId).maybeSingle();
    if (existingMember) {
      const { data: existingOrg } = await supabaseAdmin
        .from("organizations").select("slug").eq("id", existingMember.org_id).limit(1).then(r => ({ data: r.data?.[0] ?? null, error: r.error }));
      if (existingOrg) return apiOk({ success: true, slug: existingOrg.slug });
    }

    // Unique slug
    let slug = slugify(orgName);
    if (!slug) slug = `org-${Math.random().toString(36).slice(2, 8)}`;
    const { data: existing } = await supabaseAdmin
      .from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    // Create org
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 90);

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations").insert({
        name: orgName, slug, plan: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        primary_color: "#5C6AC4", onboarding_complete: false,
        cascade_level: 1, parent_org_id: null, level_name: "Corporate",
      }).select().limit(1).then(r => ({ data: r.data?.[0] ?? null, error: r.error }));

    if (orgError || !org) {
      return apiError(`Error creando organización: ${orgError?.message}`, 500);
    }

    // Create member
    const { error: memberError } = await supabaseAdmin
      .from("org_members").insert({ org_id: org.id, user_id: userId, role: "owner" });

    if (memberError) {
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      return apiError("Error configurando membresía.", 500);
    }

    return apiOk({ success: true, slug: org.slug });

  } catch (err) {
    console.error("Signup API error:", err);
    return apiError("Error interno del servidor.", 500);
  }
}
