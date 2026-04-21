"use client";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function TrialExpiredPage() {
  const router = useRouter();
  const t = useT("trial");

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "0 24px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1.75rem", color: "var(--brand)", letterSpacing: "-0.03em", marginBottom: 48 }}>
          Sprintal
        </div>

        <div style={{ width: 64, height: 64, borderRadius: "50%",
          background: "rgba(220,38,38,0.08)", border: "2px solid rgba(220,38,38,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.75rem", margin: "0 auto 24px" }}>
          ⏱
        </div>

        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "1.75rem", color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 12 }}>
          Tu período de prueba finalizó
        </div>

        <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem",
          color: "var(--t2)", lineHeight: 1.7, marginBottom: 40 }}>
          Tus 90 días de acceso gratuito a Sprintal han concluido. Para continuar usando la plataforma y acceder a tu portfolio estratégico, activá tu plan Pro.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <a href="mailto:hello@sprintal.com?subject=Activar plan Pro"
            style={{
              display: "inline-block", padding: "14px 32px",
              background: "var(--brand)", color: "#fff",
              borderRadius: "var(--r)", textDecoration: "none",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "1rem",
              width: "100%", maxWidth: 320, textAlign: "center",
            }}>
            Contactar para activar Pro →
          </a>

          <button onClick={handleSignOut}
            style={{
              padding: "10px 24px", background: "none",
              border: "1px solid var(--border-mid)", borderRadius: "var(--r)",
              fontFamily: "var(--font-body)", fontSize: "0.875rem",
              color: "var(--t3)", cursor: "pointer", width: "100%", maxWidth: 320,
            }}>
            Cerrar sesión
          </button>
        </div>

        <div style={{ marginTop: 40, fontFamily: "var(--font-body)",
          fontSize: "0.8125rem", color: "var(--t3)" }}>
          ¿Preguntas? Escribinos a{" "}
          <a href="mailto:hello@sprintal.com"
            style={{ color: "var(--brand)", textDecoration: "none" }}>
            hello@sprintal.com
          </a>
        </div>
      </div>
    </div>
  );
}
