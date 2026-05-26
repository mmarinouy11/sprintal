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
import { fetchSessionHomeClient } from "@/lib/fetchSessionHomeClient";

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

      if (plan) {
        if (!cancelled) {
          hardGo(
            `/pricing?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period || "monthly")}`
          );
        }
        return;
      }

      const orgIdFromUrl = params.get("orgId");
      const homePick = await fetchSessionHomeClient(session.access_token, {
        orgId: orgIdFromUrl,
      });
      if (!homePick.ok) {
        if (homePick.status === 401) {
          if (!cancelled) hardGo("/auth/login?error=oauth");
          return;
        }
        if (homePick.status === 403) {
          const qs = new URLSearchParams();
          qs.set("oauth", "true");
          if (plan) qs.set("plan", plan);
          if (period) qs.set("period", period);
          if (!cancelled) hardGo(`/auth/signup?${qs.toString()}`);
          return;
        }
        console.error("OAuth callback session-home:", homePick.status);
        if (!cancelled) hardGo("/");
        return;
      }

      if (!homePick.onboarding_complete) {
        if (!cancelled) hardGo(`/onboarding/${homePick.slug}`);
        return;
      }

      if (!cancelled) hardGo(`/${homePick.slug}/dashboard`);
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
