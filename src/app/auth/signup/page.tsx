"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", orgName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      // 1. Sign up via Supabase client — this triggers the confirmation email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

      // 2. Create org + member via API Route using the new user.id
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

      // 3. If session exists immediately (email confirmation disabled), go to onboarding
      // If no session, email confirmation is required — go to verify page
      if (authData.session) {
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
              Create your account
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                fontWeight:600, color:"var(--t2)", marginBottom:6, letterSpacing:"0.03em",
                textTransform:"uppercase" }}>
                Organization Name
              </label>
              <input className="input" value={form.orgName} onChange={set("orgName")}
                placeholder="e.g. Acme Corp" required autoFocus />
            </div>
            <div>
              <label style={{ display:"block", fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                fontWeight:600, color:"var(--t2)", marginBottom:6, letterSpacing:"0.03em",
                textTransform:"uppercase" }}>
                Email
              </label>
              <input className="input" type="email" value={form.email} onChange={set("email")}
                placeholder="you@company.com" required />
            </div>
            <div>
              <label style={{ display:"block", fontFamily:"var(--font-body)", fontSize:"0.8125rem",
                fontWeight:600, color:"var(--t2)", marginBottom:6, letterSpacing:"0.03em",
                textTransform:"uppercase" }}>
                Password
              </label>
              <input className="input" type="password" value={form.password} onChange={set("password")}
                placeholder="Min. 8 characters" required minLength={8} />
            </div>

            {error && (
              <div style={{ padding:"10px 14px", borderRadius:"var(--rs)",
                background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.15)",
                fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--killed)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding:"12px", borderRadius:"var(--r)",
                background:"var(--brand)", color:"#fff", border:"none", cursor:"pointer",
                fontFamily:"var(--font-body)", fontWeight:600, fontSize:"1rem",
                marginTop:4, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>

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
