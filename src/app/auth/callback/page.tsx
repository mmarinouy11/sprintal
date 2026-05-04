"use client";

/**
 * OAuth / magic-link PKCE return: exchange in the browser, then **full-page** navigation.
 * Invite emails often land here (not only /auth/accept-invite) when Supabase uses the Site URL
 * or allowlisted /auth/callback — must pick home org like / and /auth/callback/complete, not
 * org_members LIMIT 1 (non-deterministic with multiple rows).
 *
 * Supabase (production): set Site URL + Redirect URLs to match NEXT_PUBLIC_APP_URL, e.g.
 *   https://sprintal.vercel.app/auth/callback
 *   https://sprintal.vercel.app/auth/callback/complete
 *   https://sprintal.vercel.app/auth/accept-invite
 */
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import {
  selectHomeOrgFromCandidates,
  invitedOrgIdFromMetadata,
  type HomeOrgCandidate,
} from "@/lib/pickHomeOrg";
import { sprintalAuthDebug, sprintalShortId } from "@/lib/debugOrgLoad";

function hardGo(path: string) {
  window.location.replace(path);
}

function AuthOAuthCallbackInner() {
  const t = useT("auth");
  const searchParams = useSearchParams();
  const q = searchParams.toString();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = new URLSearchParams(q);
      const plan = params.get("plan");
      const period = params.get("period");
      const oauthError = params.get("error");
      const oauthErrorDescription = params.get("error_description");
      const code = params.get("code");

      sprintalAuthDebug("callback:enter", {
        path: typeof window !== "undefined" ? window.location.pathname : "",
        searchLen: q.length,
        hasCode: !!code,
        plan: plan ?? null,
      });

      if (oauthError) {
        hardGo(
          `/auth/login?error=${encodeURIComponent(oauthErrorDescription || oauthError)}`
        );
        return;
      }

      if (!code) {
        hardGo(`/auth/callback/complete${q.length ? `?${q}` : ""}`);
        return;
      }

      let session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          session = (await supabase.auth.getSession()).data.session;
          if (!session) {
            if (!cancelled) {
              console.error("OAuth exchange:", exErr.message);
              hardGo("/auth/login?error=oauth");
            }
            return;
          }
        } else {
          session = (await supabase.auth.getSession()).data.session;
        }
      }

      if (!session?.user) {
        if (!cancelled) hardGo("/auth/login?error=oauth");
        return;
      }

      sprintalAuthDebug("callback:session", { userId: sprintalShortId(session.user.id) });

      type OrgEmbed = {
        slug: string;
        onboarding_complete: boolean;
        cascade_level: number;
        parent_org_id?: string | null;
      };
      type MembershipRow = { org_id: string; organizations: OrgEmbed | OrgEmbed[] | null };

      const { data: memberships, error: membersError } = await supabase
        .from("org_members")
        .select("org_id, organizations(slug, onboarding_complete, cascade_level, parent_org_id)")
        .eq("user_id", session.user.id);

      if (membersError) {
        console.error("OAuth callback org_members:", membersError.message);
        if (!cancelled) hardGo("/");
        return;
      }

      if (!memberships?.length) {
        const qs = new URLSearchParams();
        qs.set("oauth", "true");
        if (plan) qs.set("plan", plan);
        if (period) qs.set("period", period);
        if (!cancelled) hardGo(`/auth/signup?${qs.toString()}`);
        return;
      }

      if (plan) {
        if (!cancelled) {
          hardGo(
            `/pricing?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period || "monthly")}`
          );
        }
        return;
      }

      const candidates = (memberships as unknown as MembershipRow[])
        .map((m) => {
          const o = m.organizations;
          const org = Array.isArray(o) ? o[0] : o;
          if (!org?.slug) return null;
          return {
            orgId: m.org_id,
            slug: org.slug,
            onboarding_complete: org.onboarding_complete,
            cascade_level: org.cascade_level,
            parent_org_id: org.parent_org_id ?? null,
          };
        })
        .filter((r): r is HomeOrgCandidate => r != null);

      if (!candidates.length) {
        if (!cancelled) hardGo("/auth/login");
        return;
      }

      const rawRows = memberships?.length ?? 0;
      sprintalAuthDebug("callback:memberships", {
        rawRows,
        droppedNoOrgJoin: rawRows - candidates.length,
        candidateSlugs: candidates.map((c) => c.slug),
        candidateOrgIds: candidates.map((c) => sprintalShortId(c.orgId)),
      });

      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      const invitedRaw =
        freshUser?.user_metadata?.invited_to_org ?? session.user.user_metadata?.invited_to_org;
      sprintalAuthDebug("callback:invited_to_org", {
        normalized: invitedOrgIdFromMetadata(invitedRaw),
        rawType: invitedRaw == null ? "nullish" : typeof invitedRaw,
      });

      const home = selectHomeOrgFromCandidates(candidates, invitedRaw);
      if (!home) {
        sprintalAuthDebug("callback:pickHome", { result: "null → /auth/login" });
        if (!cancelled) hardGo("/auth/login");
        return;
      }

      const target = !home.onboarding_complete
        ? `/onboarding/${home.slug}`
        : `/${home.slug}/dashboard`;
      sprintalAuthDebug("callback:redirect", {
        pickedSlug: home.slug,
        pickedOrgId: sprintalShortId(home.orgId),
        onboardingComplete: home.onboarding_complete,
        target,
      });

      if (!home.onboarding_complete) {
        if (!cancelled) hardGo(`/onboarding/${home.slug}`);
        return;
      }

      if (!cancelled) hardGo(`/${home.slug}/dashboard`);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="sprintal-spin"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid var(--raised)",
            borderTopColor: "var(--brand)",
            margin: "0 auto 16px",
          }}
        />
        <div style={{ fontFamily: "var(--font-body)", color: "var(--t2)" }}>{t("completingOAuth")}</div>
      </div>
    </div>
  );
}

export default function AuthOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg)",
          }}
        >
          <div style={{ fontFamily: "var(--font-body)", color: "var(--t2)" }}>Loading…</div>
        </div>
      }
    >
      <AuthOAuthCallbackInner />
    </Suspense>
  );
}
