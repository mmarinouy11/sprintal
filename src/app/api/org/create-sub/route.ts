import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText, sanitizeColor, sanitizeInt } from "@/lib/sanitize";

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48);
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const { allowed, resetAt } = rateLimit({ key: `create-sub:${ip}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intentá de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();
    const name = sanitizeText(body.name, 100);
    const parentOrgId = body.parentOrgId?.trim();
    const parentArea = body.parentArea ? sanitizeText(body.parentArea, 100) : null;
    const levelName = sanitizeText(body.levelName || "area", 50);
    const childLevel = sanitizeInt(body.childLevel, 1, 4, 2);
    const plan = body.plan === "pro" ? "pro" : "trial";
    const primaryColor = sanitizeColor(body.primaryColor);
    const trialEndsAt = body.trialEndsAt;
    const fromOnboarding = !!body.fromOnboarding;

    if (!name || !parentOrgId) {
      return NextResponse.json({ error: "Nombre y org padre son requeridos." }, { status: 400 });
    }
    if (childLevel > 4) {
      return NextResponse.json({ error: "Máximo 4 niveles." }, { status: 400 });
    }

    // Resolve user — for onboarding use userId from body, otherwise verify token
    let userId: string | null = null;

    if (fromOnboarding && body.userId) {
      // Trust userId from body during onboarding — user was just created
      userId = body.userId;
    } else {
      // Verify token for post-onboarding requests
      const token = req.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      userId = user.id;
    }

    if (!userId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    // Check permission — user must be member of parent org
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role")
      .eq("org_id", parentOrgId).eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      // Allow if user has ANY membership (new org during onboarding)
      const { data: anyMember } = await supabaseAdmin
        .from("org_members").select("role").eq("user_id", userId).maybeSingle();
      if (!anyMember) {
        console.log("403: no membership for user", userId, "in org", parentOrgId);
        return NextResponse.json({ error: "No tenés membresía en esta organización." }, { status: 403 });
      }
    }

    // Only owner/admin can create sub-areas
    const role = member?.role;
    if (role && !["owner", "admin"].includes(role)) {
      console.log("403: wrong role", role, "for user", userId);
      return NextResponse.json({ error: "Se requiere rol owner o admin." }, { status: 403 });
    }

    // Trial limit — no sub-areas post-onboarding
    // Use plan from body (client sends current org plan from store)
    if (!fromOnboarding && body.parentOrgPlan === "trial") {
      return NextResponse.json({
        error: "Tu plan trial no incluye sub-áreas. Activá Pro para crear una estructura multinivel.",
        code: "TRIAL_LIMIT"
      }, { status: 403 });
    }

    // Unique slug
    let slug = slugify(name);
    const { data: existing } = await supabaseAdmin
      .from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    // Create sub-org
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from("organizations").insert({
        name, slug,
        parent_org_id:       parentOrgId,
        cascade_level:       childLevel,
        level_name:          levelName || "area",
        parent_area:         parentArea || null,
        primary_color:       primaryColor,
        plan,
        trial_ends_at:       trialEndsAt,
        onboarding_complete: true,
      }).select().limit(1).then(r => ({ data: r.data?.[0] ?? null, error: r.error }));

    if (orgError || !newOrg) {
      console.error("Org creation error:", orgError);
      return NextResponse.json({ error: orgError?.message || "Error al crear el área." }, { status: 500 });
    }

    // Add user as owner
    await supabaseAdmin.from("org_members").insert({
      org_id: newOrg.id, user_id: userId, role: "owner",
    });

    return NextResponse.json({ success: true, org: newOrg });

  } catch (err) {
    console.error("Create sub-org error:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
