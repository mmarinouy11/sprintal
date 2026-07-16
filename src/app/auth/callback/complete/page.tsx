"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchSessionHomeClient } from "@/lib/fetchSessionHomeClient";
import { savePendingPlan } from "@/lib/pendingPlan";
import { pathAfterSessionHome } from "@/lib/routeAfterSessionHome";
import { useT } from "@/lib/i18n";

async function resolveHomeWithRetry(accessToken: string, orgId: string | null) {
  let last = await fetchSessionHomeClient(accessToken, { orgId });
  if (last.ok) return last;
  // Memberships can lag briefly after OAuth for returning Google users
  for (let i = 0; i < 6 && !last.ok && last.status === 403; i++) {
    await new Promise((r) => setTimeout(r, 500));
    last = await fetchSessionHomeClient(accessToken, { orgId });
  }
  return last;
}

function AuthCallbackCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT("auth");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "verifyFailed">("loading");
  const [message, setMessage] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const requestedPlan = searchParams.get("plan");
  const requestedPeriod = searchParams.get("period");
  const orgIdFromUrl = searchParams.get("orgId");

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) {
          setStatus("error");
          setMessage(exchangeErr.message || "Could not verify session.");
          return;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("error");
        setMessage("El link de confirmación es inválido o expiró.");
        return;
      }

      // Ensure the JWT is usable before calling session-home.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setStatus("error");
        setMessage(t("invalidSession"));
        return;
      }
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token ?? session.access_token;
      setAccessToken(token);

      // Persist the requested plan so it survives onboarding. Don't jump straight
      // to /pricing here: new users must onboard first, and only users who already
      // finished onboarding should go to checkout (handled below).
      savePendingPlan(requestedPlan, requestedPeriod);

      const homePick = await resolveHomeWithRetry(token, orgIdFromUrl);
      if (!homePick.ok) {
        if (homePick.status === 401) {
          setStatus("error");
          setMessage(t("invalidSession"));
          return;
        }
        if (homePick.status === 403) {
          // Do NOT assume new user — show verifyFailed + manual retry.
          setStatus("verifyFailed");
          return;
        }
        setStatus("error");
        setMessage(t("genericError"));
        return;
      }

      const org = homePick;
      setStatus("success");
      setTimeout(() => {
        router.replace(pathAfterSessionHome(org, requestedPlan, requestedPeriod));
      }, 1500);
    }

    handleCallback();
  }, [router, searchParams, t, requestedPlan, requestedPeriod, orgIdFromUrl]);

  async function handleRetry() {
    setStatus("loading");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? accessToken;
    if (!token) {
      setStatus("error");
      setMessage(t("invalidSession"));
      return;
    }

    // One definitive service_role membership check (no retry loop).
    const home = await fetchSessionHomeClient(token, { orgId: orgIdFromUrl });
    if (home.ok) {
      router.replace(pathAfterSessionHome(home, requestedPlan, requestedPeriod));
      return;
    }
    if (home.status === 401) {
      setStatus("error");
      setMessage(t("invalidSession"));
      return;
    }
    if (home.status === 403) {
      // Confirmed zero memberships — only NOW treat as new user.
      const qs = new URLSearchParams();
      qs.set("oauth", "true");
      if (requestedPlan) qs.set("plan", requestedPlan);
      if (requestedPeriod) qs.set("period", requestedPeriod);
      router.replace(`/auth/signup?${qs.toString()}`);
      return;
    }
    setStatus("verifyFailed");
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1.5rem", color: "var(--brand)", marginBottom: 32 }}>
          Sprintal
        </div>

        {status === "loading" && (
          <>
            <div
              className="sprintal-spin"
              style={{ width: 48, height: 48, borderRadius: "50%",
                border: "3px solid var(--raised)", borderTopColor: "var(--brand)",
                margin: "0 auto 20px" }}
            />
            <div style={{ fontFamily: "var(--font-body)", fontSize: "1rem",
              color: "var(--t2)" }}>
              Verificando tu email...
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%",
              background: "var(--scaled)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", margin: "0 auto 20px" }}>
              ✓
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: "1.25rem", color: "var(--text)", marginBottom: 8 }}>
              Email confirmado
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
              color: "var(--t2)" }}>
              Redirigiendo...
            </div>
          </>
        )}

        {status === "verifyFailed" && (
          <>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "1rem",
              color: "var(--t2)", marginBottom: 24 }}>
              {t("oauthVerifyFailed")}
            </div>
            <button
              type="button"
              onClick={() => void handleRetry()}
              style={{
                background: "var(--brand)", color: "#fff", borderRadius: "var(--r)",
                padding: "10px 20px", border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 600,
              }}
            >
              {t("oauthRetry")}
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%",
              background: "var(--killed)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", margin: "0 auto 20px" }}>
              ✕
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: "1.25rem", color: "var(--text)", marginBottom: 8 }}>
              Link inválido
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
              color: "var(--t2)", marginBottom: 24 }}>
              {message}
            </div>
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              style={{
                background: "var(--brand)", color: "#fff", borderRadius: "var(--r)",
                padding: "10px 20px", border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 600,
              }}
            >
              Ir al login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackCompletePage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackCompleteInner />
    </Suspense>
  );
}
