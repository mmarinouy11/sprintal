"use client";
import { useState, useEffect, Suspense } from "react";
import { useT } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import GoogleOAuthButton from "@/components/auth/GoogleOAuthButton";
import { getBrowserAppOrigin } from "@/lib/app-origin";

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT("auth");
  const oauthMode = searchParams.get("oauth") === "true";
  const planQ = searchParams.get("plan");
  const periodQ = searchParams.get("period");

  const [form, setForm] = useState({ email: "", password: "", orgName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthEmail, setOauthEmail] = useState<string | null>(null);
  const [oauthWaiting, setOauthWaiting] = useState(oauthMode);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  /** After OAuth redirect, cookies/session may not be visible to the browser client immediately. */
  useEffect(() => {
    if (!oauthMode) {
      setOauthWaiting(false);
      return;
    }
    let cancelled = false;

    const resolved = (email: string) => {
      if (cancelled) return;
      setOauthEmail(email);
      setOauthWaiting(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) resolved(session.user.email);
    });

    (async () => {
      for (let i = 0; i < 40; i++) {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          resolved(session.user.email);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          resolved(user.email);
          return;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      if (cancelled) return;
      router.replace("/auth/login?hint=oauth_new_user");
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [oauthMode, router]);

  async function handleOAuthOrgSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          orgName: form.orgName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear la organización.");
        setLoading(false);
        return;
      }
      const requestedPlan = searchParams.get("plan");
      const requestedPeriod = searchParams.get("period");
      await supabase.auth.getSession();
      router.refresh();
      if (requestedPlan) {
        const qs = new URLSearchParams();
        qs.set("plan", requestedPlan);
        if (requestedPeriod) qs.set("period", requestedPeriod);
        router.push(`/pricing?${qs.toString()}`);
        return;
      }
      router.push(`/onboarding/${data.slug}`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${getBrowserAppOrigin()}/auth/callback/complete`,
        },
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes("already")) {
          setError("Este email ya tiene una cuenta.");
        } else {
          setError(authError?.message || "Error al crear la cuenta.");
        }
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          email: form.email,
          orgName: form.orgName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear la organización.");
        setLoading(false);
        return;
      }

      if (authData.session) {
        const requestedPlan = searchParams.get("plan");
        const requestedPeriod = searchParams.get("period");
        if (requestedPlan) {
          const qs = new URLSearchParams();
          qs.set("plan", requestedPlan);
          if (requestedPeriod) qs.set("period", requestedPeriod);
          router.push(`/pricing?${qs.toString()}`);
          return;
        }
        router.push(`/onboarding/${data.slug}`);
      } else {
        router.push(`/auth/verify?email=${encodeURIComponent(form.email)}`);
      }

    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"var(--bg)" }}>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 32px" }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.75rem",
              color:"var(--brand)", letterSpacing:"-0.03em", marginBottom:4 }}>
              Sprintal
            </div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)" }}>
              {oauthMode ? t("oauthFinishTitle") : "Create your account"}
            </div>
          </div>

          {oauthMode && oauthWaiting && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                border: "3px solid var(--raised)", borderTopColor: "var(--brand)",
                animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
              }} />
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--t2)" }}>
                {t("oauthSessionLoading")}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!oauthMode && (
            <>
              <GoogleOAuthButton disabled={loading} plan={planQ} period={periodQ} />
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "var(--border-mid)" }} />
                <span className="t-mono text-xs shrink-0" style={{ color: "var(--t3)" }}>{t("orDivider")}</span>
                <div className="flex-1 h-px" style={{ background: "var(--border-mid)" }} />
              </div>
            </>
          )}

          {oauthMode && !oauthWaiting && oauthEmail && (
            <p style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t2)", marginBottom:16 }}>
              {t("signedInAs", { email: oauthEmail })}
            </p>
          )}

          {(!oauthMode || !oauthWaiting) && (
          <form onSubmit={oauthMode ? handleOAuthOrgSubmit : handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                fontWeight:600, color:"var(--t2)", marginBottom:6, letterSpacing:"0.03em",
                textTransform:"uppercase" }}>
                Organization Name
              </label>
              <input className="input" value={form.orgName} onChange={set("orgName")}
                placeholder={t("orgPlaceholder")} required autoFocus />
            </div>
            {!oauthMode && (
              <>
                <div>
                  <label style={{ display:"block", fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                    fontWeight:600, color:"var(--t2)", marginBottom:6, letterSpacing:"0.03em",
                    textTransform:"uppercase" }}>
                    Email
                  </label>
                  <input className="input" type="email" value={form.email} onChange={set("email")}
                    placeholder={t("emailPlaceholder")} required />
                </div>
                <div>
                  <label style={{ display:"block", fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                    fontWeight:600, color:"var(--t2)", marginBottom:6, letterSpacing:"0.03em",
                    textTransform:"uppercase" }}>
                    Password
                  </label>
                  <input className="input" type="password" value={form.password} onChange={set("password")}
                    placeholder={t("passwordMin")} required minLength={8} />
                </div>
              </>
            )}

            {error && (
              <div style={{ padding:"10px 14px", borderRadius:"var(--rs)",
                background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)",
                fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--killed)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || (oauthMode && (!oauthEmail || oauthWaiting))}
              style={{ padding:"12px", borderRadius:"var(--r)",
                background:"var(--brand)", color:"#fff", border:"none", cursor:"pointer",
                fontFamily:"var(--font-body)", fontWeight:600, fontSize:"1rem",
                marginTop:4, opacity: loading ? 0.7 : 1 }}>
              {loading ? t("creating") : oauthMode ? t("oauthFinishCta") : t("signUp")}
            </button>
          </form>
          )}

          <div style={{ marginTop:24, textAlign:"center", fontFamily:"var(--font-body)",
            fontSize:"0.875rem", color:"var(--t3)" }}>
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color:"var(--brand)", fontWeight:600, textDecoration:"none" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ color: "var(--t2)", fontFamily: "var(--font-body)" }}>Loading…</div>
      </div>
    }>
      <SignupPageInner />
    </Suspense>
  );
}
