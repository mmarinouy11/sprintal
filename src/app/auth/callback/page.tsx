"use client";

/**
 * OAuth PKCE return (Google, etc.): exchange runs in the **browser** so session cookies
 * are written the same way as signInWithOAuth — server-side exchange often drops Set-Cookie
 * on Vercel/Next redirects.
 * Email confirmation with hash: /auth/callback/complete
 */
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

function AuthOAuthCallbackInner() {
  const router = useRouter();
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
        router.replace(
          `/auth/login?error=${encodeURIComponent(oauthErrorDescription || oauthError)}`
        );
        return;
      }

      if (!code) {
        router.replace(`/auth/callback/complete${q.length ? `?${q}` : ""}`);
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
              router.replace("/auth/login?error=oauth");
            }
            return;
          }
        } else {
          session = (await supabase.auth.getSession()).data.session;
        }
      }

      if (!session?.user) {
        if (!cancelled) router.replace("/auth/login?error=oauth");
        return;
      }

      const { data: members, error: membersError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .limit(1);

      if (membersError) {
        console.error("OAuth callback org_members:", membersError.message);
        if (!cancelled) router.replace("/");
        return;
      }

      const hasOrg = Boolean(members?.[0]);

      router.refresh();

      if (!hasOrg) {
        const qs = new URLSearchParams();
        qs.set("oauth", "true");
        if (plan) qs.set("plan", plan);
        if (period) qs.set("period", period);
        if (!cancelled) router.replace(`/auth/signup?${qs.toString()}`);
        return;
      }

      if (plan) {
        if (!cancelled) {
          router.replace(
            `/pricing?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period || "monthly")}`
          );
        }
        return;
      }

      if (!cancelled) router.replace("/");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, q]);

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
