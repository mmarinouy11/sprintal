"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchSessionHomeClient } from "@/lib/fetchSessionHomeClient";
import { sprintalAuthDebug, sprintalShortId } from "@/lib/debugOrgLoad";

function AuthCallbackCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

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

      sprintalAuthDebug("callback/complete:session", {
        userId: sprintalShortId(session.user.id),
        hasCode: !!searchParams.get("code"),
      });

      const requestedPlan = searchParams.get("plan");
      const requestedPeriod = searchParams.get("period");
      if (requestedPlan) {
        const qs = new URLSearchParams();
        qs.set("plan", requestedPlan);
        if (requestedPeriod) qs.set("period", requestedPeriod);
        router.replace(`/pricing?${qs.toString()}`);
        return;
      }

      const homePick = await fetchSessionHomeClient(session.access_token);
      if (!homePick.ok) {
        if (homePick.status === 401) {
          setStatus("error");
          setMessage("Sesión inválida. Volvé a iniciar sesión.");
          return;
        }
        const qs = new URLSearchParams();
        qs.set("oauth", "true");
        if (requestedPlan) qs.set("plan", requestedPlan);
        if (requestedPeriod) qs.set("period", requestedPeriod);
        router.replace(`/auth/signup?${qs.toString()}`);
        return;
      }

      const org = homePick;
      setStatus("success");
      const dest = !org.onboarding_complete
        ? `/onboarding/${org.slug}`
        : `/${org.slug}/dashboard`;
      sprintalAuthDebug("callback/complete:redirect", {
        pickedSlug: org.slug,
        pickedOrgId: sprintalShortId(org.orgId),
        dest,
        via: "session-home",
      });
      setTimeout(() => {
        if (!org.onboarding_complete) {
          router.replace(`/onboarding/${org.slug}`);
        } else {
          router.replace(`/${org.slug}/dashboard`);
        }
      }, 1500);
    }

    handleCallback();
  }, [router, searchParams]);

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
            <a href="/auth/login" style={{
              display: "inline-block", padding: "10px 24px",
              background: "var(--brand)", color: "#fff", borderRadius: "var(--r)",
              fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600,
              textDecoration: "none",
            }}>
              Volver al login
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackCompletePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ fontFamily: "var(--font-body)", color: "var(--t2)" }}>Loading…</div>
      </div>
    }>
      <AuthCallbackCompleteInner />
    </Suspense>
  );
}
