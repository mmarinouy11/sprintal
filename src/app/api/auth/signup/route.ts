import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText, validateEmail } from "@/lib/sanitize";

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48);
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per hour
  const ip = getClientIp(req);
  const { allowed, resetAt } = rateLimit({ key: `signup:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intentá de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    );
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
      return NextResponse.json({ error: "Nombre de organización requerido." }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    // Verify user exists in Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    // Check if org already exists for this user (avoid duplicates)
    const { data: existingMember } = await supabaseAdmin
      .from("org_members").select("org_id").eq("user_id", userId).maybeSingle();
    if (existingMember) {
      const { data: existingOrg } = await supabaseAdmin
        .from("organizations").select("slug").eq("id", existingMember.org_id).single();
      if (existingOrg) return NextResponse.json({ success: true, slug: existingOrg.slug });
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
      }).select().single();

    if (orgError || !org) {
      return NextResponse.json({ error: `Error creando organización: ${orgError?.message}` }, { status: 500 });
    }

    // Create member
    const { error: memberError } = await supabaseAdmin
      .from("org_members").insert({ org_id: org.id, user_id: userId, role: "owner" });

    if (memberError) {
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      return NextResponse.json({ error: "Error configurando membresía." }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug: org.slug });

  } catch (err) {
    console.error("Signup API error:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
