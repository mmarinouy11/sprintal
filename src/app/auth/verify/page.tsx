"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const t = useTranslations("auth");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function resend() {
    if (!email) return;
    setResending(true);
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "0 24px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1.5rem", color: "var(--brand)", marginBottom: 40 }}>
          Sprintal
        </div>

        {/* Email icon */}
        <div style={{ width: 72, height: 72, borderRadius: "50%",
          background: "var(--brand-bg)", border: "2px solid var(--brand-mid)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2rem", margin: "0 auto 24px" }}>
          ✉
        </div>

        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "1.5rem", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 12 }}>
          Revisá tu email
        </div>

        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem",
          color: "var(--t2)", lineHeight: 1.6, marginBottom: 8 }}>
          Te enviamos un link de confirmación a
        </div>

        {email && (
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 600,
            fontSize: "1rem", color: "var(--text)", marginBottom: 32 }}>
            {email}
          </div>
        )}

        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
          color: "var(--t3)", lineHeight: 1.6, marginBottom: 32 }}>
          Hacé click en el link del email para activar tu cuenta y comenzar el setup.
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem",
            color: "var(--t3)", marginBottom: 12 }}>
            ¿No llegó el email?
          </div>
          <button onClick={resend} disabled={resending || resent}
            style={{
              padding: "8px 20px", borderRadius: "var(--rs)",
              border: "1px solid var(--border-mid)",
              background: resent ? "var(--scaled)" : "var(--surface)",
              color: resent ? "#fff" : "var(--t2)",
              fontFamily: "var(--font-body)", fontSize: "0.875rem",
              cursor: resending ? "default" : "pointer",
              transition: "all 0.15s",
            }}>
            {resent ? "✓ Email enviado" : resending ? "..." : t("resend")}
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <a href="/auth/login" style={{
            fontFamily: "var(--font-body)", fontSize: "0.875rem",
            color: "var(--t3)", textDecoration: "none",
          }}>
            ← Volver al login
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
