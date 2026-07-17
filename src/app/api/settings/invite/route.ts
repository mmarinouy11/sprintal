import { NextRequest } from "next/server";
import { createClient, type User, type SupabaseClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiOk } from "@/lib/api-response";
import { validateEmail } from "@/lib/sanitize";
import type { OrgRole } from "@/types";

export const dynamic = "force-dynamic";

const INVITE_ROLES: readonly OrgRole[] = ["admin", "editor", "viewer"];

function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/** Machine-readable codes only — UI maps via useT(), never shows raw/Supabase text. */
function inviteError(code: string, status: number) {
  return apiOk({ error: code, code }, { status });
}

/**
 * Look up an Auth user by email via paginated admin.listUsers.
 * Fine for expected volume (hundreds–low thousands of Auth users).
 * Avoids needing a security-definer RPC on auth.users.
 */
async function findAuthUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const perPage = 200;
  // Cap: ~10k users. Beyond that, add an RPC on auth.users.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("invite listUsers failed:", error);
      return null;
    }
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (hit) return hit;
    if (users.length < perPage) return null;
  }
  return null;
}

async function sendAddedToOrgEmail(opts: {
  to: string;
  orgName: string;
  role: string;
  loginUrl: string;
}): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("invite: CRON_SECRET missing — cannot send added-to-org email");
    return false;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    opts.loginUrl.replace(/\/auth\/login.*$/, "") ||
    "";
  const endpoint = `${baseUrl}/api/email/send`;
  const subject = `You've been added to ${opts.orgName} on Sprintal`;
  const safeOrg = escapeHtml(opts.orgName);
  const safeRole = escapeHtml(opts.role);
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111;line-height:1.45">
    <h2 style="color:#5C6AC4;margin:0 0 12px 0">Sprintal</h2>
    <p>You've been added to <strong>${safeOrg}</strong> as <strong>${safeRole}</strong>.</p>
    <p>Sign in with your existing Sprintal account to get started — no password reset needed.</p>
    <p style="margin:16px 0"><a href="${opts.loginUrl}" style="color:#5C6AC4">Open Sprintal</a></p>
  </div>`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ to: opts.to, subject, html }),
    });
    if (!res.ok) {
      console.error("invite added-to-org email HTTP error:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("invite added-to-org email failed:", e);
    return false;
  }
}

async function upsertOrgMember(
  supabaseAdmin: SupabaseClient,
  orgId: string,
  userId: string,
  role: OrgRole,
  fullName: string
) {
  return supabaseAdmin.from("org_members").upsert(
    {
      org_id: orgId,
      user_id: userId,
      role,
      full_name: fullName,
    },
    { onConflict: "org_id,user_id" }
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `settings-invite:${ip}`, limit: 10, windowMs: 60_000 });
  if (!allowed) return inviteError("RATE_LIMITED", 429);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return inviteError("UNAUTHORIZED", 401);

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return inviteError("UNAUTHORIZED", 401);

    const body = await req.json();
    const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
    const email = validateEmail(body.email);
    const roleRaw = typeof body.role === "string" ? body.role.trim() : "";
    const role = (INVITE_ROLES as readonly string[]).includes(roleRaw)
      ? (roleRaw as OrgRole)
      : null;

    if (!orgId || !email || !role) {
      return inviteError("INVALID_INPUT", 400);
    }

    // Verify caller has admin rights
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.id)
      .limit(1).maybeSingle();

    if (!member || !["owner", "admin"].includes(member.role)) {
      return inviteError("FORBIDDEN", 403);
    }

    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    const orgName = orgRow?.name?.trim() || "your organization";

    const baseUrl = getInviteAppBaseUrl();
    if (!baseUrl) {
      return inviteError("MISCONFIGURED", 500);
    }

    // org_members is hard-deleted on remove (no soft-delete) — re-invite = insert again.
    const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, email);

    if (existingAuthUser) {
      const { data: existingMember } = await supabaseAdmin
        .from("org_members")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", existingAuthUser.id)
        .maybeSingle();

      if (existingMember) {
        return inviteError("ALREADY_MEMBER", 409);
      }

      const displayName =
        (typeof existingAuthUser.user_metadata?.full_name === "string" &&
          existingAuthUser.user_metadata.full_name.trim()) ||
        email.split("@")[0];

      const { error: memberError } = await upsertOrgMember(
        supabaseAdmin,
        orgId,
        existingAuthUser.id,
        role,
        displayName
      );

      if (memberError) {
        console.error("invite org_members upsert (existing user) failed:", memberError);
        return inviteError("MEMBER_WRITE_FAILED", 500);
      }

      // Point session-home / accept-invite metadata at this org (best-effort).
      const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          ...(existingAuthUser.user_metadata ?? {}),
          invited_to_org: orgId,
          invited_role: role,
        },
      });
      if (metaErr) {
        console.error("invite updateUserById metadata failed:", metaErr);
      }

      const emailSent = await sendAddedToOrgEmail({
        to: email,
        orgName,
        role,
        loginUrl: `${baseUrl}/auth/login`,
      });

      return apiOk({ success: true, alreadyHadAccount: true, emailSent });
    }

    // New Auth user — keep invite + set-password email flow.
    const redirectTo = `${baseUrl}/auth/accept-invite?orgId=${encodeURIComponent(orgId)}&role=${encodeURIComponent(role)}`;

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { invited_to_org: orgId, invited_role: role },
      redirectTo,
    });

    if (inviteErr || !inviteData.user) {
      console.error("inviteUserByEmail failed:", inviteErr);
      // Race: user created between our lookup and invite — retry existing-user path once.
      const raced = await findAuthUserByEmail(supabaseAdmin, email);
      if (raced) {
        const { data: existingMember } = await supabaseAdmin
          .from("org_members")
          .select("id")
          .eq("org_id", orgId)
          .eq("user_id", raced.id)
          .maybeSingle();
        if (existingMember) return inviteError("ALREADY_MEMBER", 409);

        const { error: memberError } = await upsertOrgMember(
          supabaseAdmin,
          orgId,
          raced.id,
          role,
          email.split("@")[0]
        );
        if (memberError) {
          console.error("invite org_members upsert (race) failed:", memberError);
          return inviteError("MEMBER_WRITE_FAILED", 500);
        }
        const emailSent = await sendAddedToOrgEmail({
          to: email,
          orgName,
          role,
          loginUrl: `${baseUrl}/auth/login`,
        });
        return apiOk({ success: true, alreadyHadAccount: true, emailSent });
      }
      return inviteError("INVITE_FAILED", 400);
    }

    const { error: memberError } = await upsertOrgMember(
      supabaseAdmin,
      orgId,
      inviteData.user.id,
      role,
      email.split("@")[0]
    );

    if (memberError) {
      console.error("invite org_members upsert failed:", memberError);
      return inviteError("MEMBER_WRITE_FAILED", 500);
    }

    return apiOk({ success: true, alreadyHadAccount: false });
  } catch (e) {
    console.error("settings/invite error:", e);
    return inviteError("SERVER_ERROR", 500);
  }
}
