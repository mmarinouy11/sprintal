"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("error");
        setMessage("El link de confirmación es inválido o expiró.");
        return;
      }

      // Get user's org
      const { data: members } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", session.user.id);

      if (!members?.length) {
        setStatus("error");
        setMessage("No se encontró ninguna organización para este usuario.");
        return;
      }

      const { data: orgs } = await supabase
        .from("organizations")
        .select("slug, onboarding_complete, cascade_level")
        .in("id", members.map(m => m.org_id))
        .order("cascade_level", { ascending: true });

      const org = orgs?.[0];
      if (!org) {
        setStatus("error");
        setMessage("No se encontró la organización.");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        if (!org.onboarding_complete) {
          router.replace(`/${org.slug}/onboarding`);
        } else {
          router.replace(`/${org.slug}/dashboard`);
        }
      }, 1500);
    }

    handleCallback();
  }, []);

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
            <div style={{ width: 48, height: 48, borderRadius: "50%",
              border: "3px solid var(--raised)", borderTopColor: "var(--brand)",
              animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
