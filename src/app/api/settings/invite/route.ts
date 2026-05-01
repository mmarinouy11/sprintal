import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Canonical origin for invite emails — never use VERCEL_URL (preview/deployment host).
 * Vercel: use APP_URL or INVITE_APP_ORIGIN (server env, runtime). Names are case-sensitive;
 * if you used `app_url` in the dashboard, it must match one of the keys below.
 * Production fallback: VERCEL_PROJECT_PRODUCTION_URL (https://…) when VERCEL_ENV === "production".
 */
function getInviteAppBaseUrl(): string {
  const tryKeys = [
    process.env.APP_URL,
    process.env.INVITE_APP_ORIGIN,
    process.env.app_url,
    process.env.invite_app_origin,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const raw of tryKeys) {
    const t = raw?.trim();
    if (t) return normalizeOrigin(t);
  }

  const vercelEnv = process.env.VERCEL_ENV;
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelEnv === "production" && prodHost) {
    return normalizeOrigin(`https://${prodHost}`);
  }

  return "";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `settings-invite:${ip}`, limit: 10, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return apiError("Unauthorized", 401);

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return apiError("Unauthorized", 401);

    const { orgId, email, role } = await req.json();

    // Verify caller has admin rights
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id)
      .limit(1).maybeSingle();

    if (!member || !["owner", "admin"].includes(member.role)) {
      return apiError("Insufficient permissions", 403);
    }

    const baseUrl = getInviteAppBaseUrl();
    if (!baseUrl) {
      return apiError(
        "Server misconfiguration: set APP_URL (or INVITE_APP_ORIGIN) to https://sprintal.vercel.app for Production and Preview if you invite from previews. Optional: NEXT_PUBLIC_APP_URL.",
        500
      );
    }

    const redirectTo = `${baseUrl}/auth/accept-invite?orgId=${encodeURIComponent(orgId)}&role=${encodeURIComponent(role)}`;

    // Invite via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { invited_to_org: orgId, invited_role: role },
      redirectTo,
    });

    if (inviteError) return apiError(inviteError.message, 400);

    // Pre-create org_member record
    const { error: memberError } = await supabaseAdmin.from("org_members").upsert(
      {
        org_id: orgId,
        user_id: inviteData.user.id,
        role,
        full_name: email.split("@")[0],
      },
      { onConflict: "org_id,user_id" }
    );
    if (memberError) {
      console.error("invite org_members upsert:", memberError);
      return apiError(memberError.message, 500);
    }

    return apiOk({ success: true });
  } catch {
    return apiError("Server error", 500);
  }
}
