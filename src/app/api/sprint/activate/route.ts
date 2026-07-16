import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `sprint-activate:${ip}`, limit: 30, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return apiError("Unauthorized.", 401);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return apiError("Unauthorized.", 401);

    const body = await req.json() as { sprintId?: string };
    const sprintId = body.sprintId?.trim();
    if (!sprintId) return apiError("sprintId required.", 400);

    const { data: sprint } = await supabaseAdmin
      .from("sprints")
      .select("id, org_id, status")
      .eq("id", sprintId)
      .maybeSingle();

    if (!sprint) return apiError("Sprint not found.", 404);
    if (sprint.status === "Active") {
      const { data: full } = await supabaseAdmin
        .from("sprints")
        .select("*")
        .eq("id", sprintId)
        .maybeSingle();
      return apiOk({ sprint: full ?? sprint });
    }
    if (sprint.status !== "Planned") {
      return apiError("Only planned sprints can be activated.", 400);
    }

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", sprint.org_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    // Mirror /api/settings/update-org and create-sub: owner | admin only
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return apiError("Forbidden.", 403);
    }

    const { count } = await supabaseAdmin
      .from("sprints")
      .select("id", { count: "exact", head: true })
      .eq("org_id", sprint.org_id)
      .eq("status", "Active");

    if ((count ?? 0) > 0) {
      return apiError("already_active", 409);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("sprints")
      .update({ status: "Active" })
      .eq("id", sprintId)
      .select()
      .maybeSingle();

    if (error) {
      // Partial unique index sprints_one_active_per_org
      if (error.code === "23505") return apiError("already_active", 409);
      console.error("sprint/activate update", error);
      return apiError(error.message, 500);
    }
    if (!updated) return apiError("Unable to activate sprint.", 500);

    return apiOk({ sprint: updated });
  } catch (e) {
    console.error("sprint/activate", e);
    return apiError("Internal error.", 500);
  }
}
