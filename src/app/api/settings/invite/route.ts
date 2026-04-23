import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
function getInviteAppBaseUrl(): { base: string; source: string } {
  const tryKeys: [string, string | undefined][] = [
    ["APP_URL", process.env.APP_URL],
    ["INVITE_APP_ORIGIN", process.env.INVITE_APP_ORIGIN],
    ["app_url", process.env.app_url],
    ["invite_app_origin", process.env.invite_app_origin],
    ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
  ];

  for (const [source, raw] of tryKeys) {
    const t = raw?.trim();
    if (t) return { base: normalizeOrigin(t), source };
  }

  const vercelEnv = process.env.VERCEL_ENV;
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelEnv === "production" && prodHost) {
    const base = normalizeOrigin(`https://${prodHost}`);
    return { base, source: "VERCEL_PROJECT_PRODUCTION_URL" };
  }

  return { base: "", source: "none" };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orgId, email, role } = await req.json();

    // Verify caller has admin rights
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id)
      .limit(1).maybeSingle();

    if (!member || !["owner", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { base: baseUrl, source: baseSource } = getInviteAppBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: set APP_URL (or INVITE_APP_ORIGIN) to https://sprintal.vercel.app for Production and Preview if you invite from previews. Optional: NEXT_PUBLIC_APP_URL.",
        },
        { status: 500 }
      );
    }

    const redirectTo = `${baseUrl}/auth/accept-invite?orgId=${encodeURIComponent(orgId)}&role=${encodeURIComponent(role)}`;
    console.log("invite redirectTo:", redirectTo, "baseSource:", baseSource, {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    });

    // If the email link still shows the wrong host, check Supabase Dashboard → Authentication →
    // Email Templates → "Invite user": use {{ .ConfirmationURL }} (or {{ .RedirectTo }} per docs),
    // not {{ .SiteURL }}, for the button href. Also whitelist this redirectTo under URL Configuration → Redirect URLs.

    // Invite via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { invited_to_org: orgId, invited_role: role },
      redirectTo,
    });

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 });

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
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, redirectTo, inviteBaseSource: baseSource });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
