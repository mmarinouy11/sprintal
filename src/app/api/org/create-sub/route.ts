import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";
import { sanitizeText, sanitizeColor, sanitizeInt } from "@/lib/sanitize";
import { COACH_LIMITS, type Plan } from "@/types";

function planSupportsSemantic(planVal: string): boolean {
  const lim = COACH_LIMITS[planVal as Plan];
  return !!lim && (lim.semantic > 0 || lim.semantic === -1);
}

function readBool(v: unknown, defaultVal: boolean): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return defaultVal;
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48);
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  const { allowed, resetAt } = rateLimit({ key: `create-sub:${ip}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return apiError("Demasiados intentos. Intentá de nuevo más tarde.", 429, {
      "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
    });
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
    const plan = (body.plan || "trial") as string; // inherit from parent, default trial
    const primaryColor = sanitizeColor(body.primaryColor);
    const trialEndsAtBody = body.trialEndsAt;
    const fromOnboarding = !!body.fromOnboarding;

    const coachSyntacticEnabled = readBool(body.coachSyntacticEnabled, true);
    let coachSemanticEnabled = readBool(body.coachSemanticEnabled, false);
    if (!planSupportsSemantic(plan)) {
      coachSemanticEnabled = false;
    }

    if (!name || !parentOrgId) {
      return apiError("Nombre y org padre son requeridos.", 400);
    }
    if (childLevel > 4) {
      return apiError("Máximo 4 niveles.", 400);
    }

    // Resolve user — for onboarding use userId from body, otherwise verify token
    let userId: string | null = null;

    if (fromOnboarding && body.userId) {
      // Trust userId from body during onboarding — user was just created
      userId = body.userId;
    } else {
      // Verify token for post-onboarding requests
      const token = req.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) return apiError("No autorizado.", 401);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return apiError("No autorizado.", 401);
      userId = user.id;
    }

    if (!userId) return apiError("No autorizado.", 401);

    // Check permission — user must be member of parent org
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role")
      .eq("org_id", parentOrgId).eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      // Allow if user has ANY membership (new org during onboarding)
      const { data: fallbackMember } = await supabaseAdmin
        .from("org_members").select("role").eq("user_id", userId).maybeSingle();
      if (!fallbackMember) {
        return apiError("No tenés membresía en esta organización.", 403);
      }
    }

    // Only owner/admin can create sub-areas
    const role = member?.role;
    if (role && !["owner", "admin"].includes(role)) {
      return apiError("Se requiere rol owner o admin.", 403);
    }

    // Trial limit — no sub-areas post-onboarding
    // Use plan from body (client sends current org plan from store)
    if (!fromOnboarding && body.parentOrgPlan === "trial") {
      return apiOk(
        {
          error: "Tu plan trial no incluye sub-áreas. Activá Pro para crear una estructura multinivel.",
          code: "TRIAL_LIMIT",
        },
        { status: 403 }
      );
    }

    // Unique slug
    let slug = slugify(name);
    const { data: existing } = await supabaseAdmin
      .from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    let resolvedTrialEndsAt: string | null = null;
    if (typeof trialEndsAtBody === "string" && trialEndsAtBody.trim()) {
      resolvedTrialEndsAt = trialEndsAtBody.trim();
    } else if (plan === "trial") {
      const { data: parentRow } = await supabaseAdmin
        .from("organizations")
        .select("trial_ends_at")
        .eq("id", parentOrgId)
        .limit(1)
        .maybeSingle();
      resolvedTrialEndsAt = parentRow?.trial_ends_at ?? null;
    }

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
        trial_ends_at:       resolvedTrialEndsAt,
        onboarding_complete: true,
        coach_syntactic_enabled: coachSyntacticEnabled,
        coach_semantic_enabled:  coachSemanticEnabled,
      }).select().limit(1).then(r => ({ data: r.data?.[0] ?? null, error: r.error }));

    if (orgError || !newOrg) {
      console.error("Org creation error:", orgError);
      return apiError(orgError?.message || "Error al crear el área.", 500);
    }

    // Add user as owner
    await supabaseAdmin.from("org_members").insert({
      org_id: newOrg.id, user_id: userId, role: "owner",
    });

    return apiOk({ success: true, org: newOrg });

  } catch (err) {
    console.error("Create sub-org error:", err);
    return apiError("Error interno del servidor.", 500);
  }
}
