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
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { fetchSessionHomeClient } from "@/lib/fetchSessionHomeClient";
import { savePendingPlan } from "@/lib/pendingPlan";
import { pathAfterSessionHome } from "@/lib/routeAfterSessionHome";

function hardGo(path: string) {
  window.location.replace(path);
}

function AuthOAuthCallbackInner() {
  const t = useT("auth");
  const searchParams = useSearchParams();
  const q = searchParams.toString();
  const [phase, setPhase] = useState<"loading" | "verifyFailed">("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [orgIdFromUrl, setOrgIdFromUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = new URLSearchParams(q);
      const planParam = params.get("plan");
      const periodParam = params.get("period");
      const oauthError = params.get("error");
      const oauthErrorDescription = params.get("error_description");
      const code = params.get("code");

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

      // Ensure the JWT is usable before calling session-home (avoids false 403 → signup).
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        if (!cancelled) hardGo("/auth/login?error=oauth");
        return;
      }
      session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        if (!cancelled) hardGo("/auth/login?error=oauth");
        return;
      }

      // Persist the requested plan so it survives signup/onboarding. Don't jump
      // straight to /pricing here: new users must onboard first, and only users
      // who already finished onboarding should go to checkout (handled below).
      savePendingPlan(planParam, periodParam);

      const orgIdParam = params.get("orgId");
      if (!cancelled) {
        setAccessToken(session.access_token);
        setOrgIdFromUrl(orgIdParam);
        setPlan(planParam);
        setPeriod(periodParam);
      }

      let homePick = await fetchSessionHomeClient(session.access_token, {
        orgId: orgIdParam,
      });
      // Retry longer — false 403 right after OAuth sends existing users to signup/onboarding.
      for (let i = 0; i < 6 && !homePick.ok && homePick.status === 403; i++) {
        await new Promise((r) => setTimeout(r, 500));
        homePick = await fetchSessionHomeClient(session.access_token, {
          orgId: orgIdParam,
        });
      }
      if (!homePick.ok) {
        if (homePick.status === 401) {
          if (!cancelled) hardGo("/auth/login?error=oauth");
          return;
        }
        if (homePick.status === 403) {
          // Do NOT assume new user — show verifyFailed + manual retry.
          if (!cancelled) setPhase("verifyFailed");
          return;
        }
        console.error("OAuth callback session-home:", homePick.status);
        if (!cancelled) hardGo("/");
        return;
      }

      if (!cancelled) hardGo(pathAfterSessionHome(homePick, planParam, periodParam));
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [q]);

  async function handleRetry() {
    setPhase("loading");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? accessToken;
    if (!token) {
      hardGo("/auth/login?error=oauth");
      return;
    }

    // One definitive service_role membership check (no retry loop).
    const home = await fetchSessionHomeClient(token, { orgId: orgIdFromUrl });
    if (home.ok) {
      hardGo(pathAfterSessionHome(home, plan, period));
      return;
    }
    if (home.status === 401) {
      hardGo("/auth/login?error=oauth");
      return;
    }
    if (home.status === 403) {
      // Confirmed zero memberships — only NOW treat as new user.
      const qs = new URLSearchParams();
      qs.set("oauth", "true");
      if (plan) qs.set("plan", plan);
      if (period) qs.set("period", period);
      hardGo(`/auth/signup?${qs.toString()}`);
      return;
    }
    setPhase("verifyFailed");
  }

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
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {phase === "loading" && (
          <>
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
          </>
        )}
        {phase === "verifyFailed" && (
          <>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "var(--t2)", marginBottom: 24 }}>
              {t("oauthVerifyFailed")}
            </div>
            <button
              type="button"
              onClick={() => void handleRetry()}
              className="btn-primary"
              style={{ padding: "10px 20px" }}
            >
              {t("oauthRetry")}
            </button>
          </>
        )}
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
