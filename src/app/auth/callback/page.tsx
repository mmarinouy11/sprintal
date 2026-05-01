"use client";

/**
 * OAuth PKCE return: exchange in the browser, then **full-page** navigation so the next
 * request always sends session cookies (avoids Next client router + RSC cookie races).
 *
 * Supabase (production): set Site URL + Redirect URLs to match NEXT_PUBLIC_APP_URL, e.g.
 *   https://sprintal.vercel.app/auth/callback
 *   https://sprintal.vercel.app/auth/callback/complete
 */
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

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

      const { data: members, error: membersError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .limit(1);

      if (membersError) {
        console.error("OAuth callback org_members:", membersError.message);
        if (!cancelled) hardGo("/");
        return;
      }

      const member = members?.[0];
      if (!member) {
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

      const { data: orgRow, error: orgErr } = await supabase
        .from("organizations")
        .select("slug, onboarding_complete")
        .eq("id", member.org_id)
        .maybeSingle();

      if (orgErr || !orgRow?.slug) {
        if (!cancelled) hardGo("/auth/login");
        return;
      }

      if (!orgRow.onboarding_complete) {
        if (!cancelled) hardGo(`/onboarding/${orgRow.slug}`);
        return;
      }

      if (!cancelled) hardGo(`/${orgRow.slug}/dashboard`);
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
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid var(--raised)",
            borderTopColor: "var(--brand)",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <div style={{ fontFamily: "var(--font-body)", color: "var(--t2)" }}>{t("completingOAuth")}</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
