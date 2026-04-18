"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function confirm() {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || type !== "email") {
        setStatus("error");
        setMessage("Invalid confirmation link.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash, type: "email" });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("success");

      // Get user's org and redirect to onboarding
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login"); return; }

        const { data: members } = await supabase
          .from("org_members").select("org_id")
          .eq("user_id", user.id).limit(1);

        if (!members?.length) { router.push("/auth/login"); return; }

        const { data: org } = await supabase
          .from("organizations").select("slug, onboarding_complete")
          .eq("id", members[0].org_id).single();

        if (!org) { router.push("/auth/login"); return; }

        router.push(org.onboarding_complete
          ? `/${org.slug}/dashboard`
          : `/${org.slug}/onboarding`
        );
      }, 1500);
    }
    confirm();
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        {status === "loading" && (
          <>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"2rem",
              color:"var(--brand)", letterSpacing:"-0.03em", marginBottom:12 }}>
              Sprintal
            </div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)" }}>
              Confirming your email...
            </div>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize:"3rem", marginBottom:16 }}>✓</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.5rem",
              color:"var(--text)", letterSpacing:"-0.02em", marginBottom:8 }}>
              Email confirmed
            </div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)" }}>
              Redirecting you to Sprintal...
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize:"3rem", marginBottom:16 }}>✗</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.5rem",
              color:"var(--killed)", letterSpacing:"-0.02em", marginBottom:8 }}>
              Confirmation failed
            </div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t3)",
              marginBottom:24 }}>
              {message}
            </div>
            <button onClick={() => router.push("/auth/login")}
              style={{ padding:"10px 24px", borderRadius:"var(--r)", background:"var(--brand)",
                color:"#fff", border:"none", cursor:"pointer", fontFamily:"var(--font-body)",
                fontSize:"0.875rem", fontWeight:600 }}>
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
