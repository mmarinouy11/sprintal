import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `settings-update-org:${ip}`, limit: 20, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return apiError("Unauthorized", 401);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return apiError("Unauthorized", 401);

    const body = await req.json() as {
      orgId?: string;
      name?: string;
      primaryColor?: string;
    };

    const orgId = body.orgId?.trim();
    const name = body.name?.trim();
    const primaryColor = body.primaryColor?.trim();
    if (!orgId || !name || !primaryColor) {
      return apiError("Missing required fields.", 400);
    }

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return apiError("Forbidden.", 403);
    }

    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ name, primary_color: primaryColor })
      .eq("id", orgId)
      .select("id, name, primary_color")
      .limit(1)
      .maybeSingle();

    if (updateError || !updatedOrg) {
      return apiError("Unable to update organization.", 500);
    }

    // Defensive readback to ensure the response reflects stored DB state.
    const { data: persistedOrg, error: readbackError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, primary_color")
      .eq("id", orgId)
      .limit(1)
      .maybeSingle();

    if (readbackError || !persistedOrg) {
      return apiError("Unable to verify organization update.", 500);
    }

    return apiOk({ org: persistedOrg });
  } catch {
    return apiError("Internal error.", 500);
  }
}
