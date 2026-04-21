"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const t = useT("auth");
  const tg = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email before logging in. Check your inbox for the confirmation link.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    // Get org via API Route — uses service_role, bypasses RLS
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "No se encontró la organización.");
      setLoading(false);
      return;
    }

    const org = await res.json();

    if (!org.onboarding_complete) {
      router.push(`/onboarding/${org.slug}`);
    } else {
      router.push(`/${org.slug}/dashboard`);
    }
  }

  return (
    <div className="min-h-screen flex" style={{background:"var(--bg)"}}>
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="font-extrabold text-3xl tracking-tight mb-1"
              style={{color:"var(--brand)",letterSpacing:"-0.03em"}}>
              Sprintal
            </div>
            <div className="t-label">Strategic Portfolio Management</div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="t-label block mb-2">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                className="input" placeholder={t("emailPlaceholder")} required />
            </div>
            <div>
              <label className="t-label block mb-2">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                className="input" placeholder="••••••••" required />
            </div>
            {error && (
              <div className="t-mono text-sm p-3 rounded"
                style={{background:"rgba(220,38,38,0.06)",color:"#DC2626",border:"1px solid rgba(220,38,38,0.12)"}}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>
          <p className="mt-8 t-mono text-center" style={{color:"var(--t3)"}}>
            No account?{" "}
            <Link href="/auth/signup" className="underline underline-offset-2 font-medium"
              style={{color:"var(--brand)"}}>
              Start free trial
            </Link>
          </p>
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:flex w-96 flex-col justify-between p-12"
        style={{background:"var(--sidebar)",borderLeft:"1px solid var(--border)"}}>
        <div>
          <div className="t-label mb-6" style={{color:"var(--brand)"}}>
            {tg("landing.tagline")}
          </div>
          <div className="font-extrabold text-4xl leading-tight mb-6"
            style={{color:"var(--text)",letterSpacing:"-0.03em"}}>
{tg("landing.headline").split("\n").map((line, i) => <span key={i}>{line}<br/></span>)}
          </div>
          <p className="text-base leading-relaxed" style={{color:"var(--t2)"}}>
{tg("landing.desc")}
          </p>
        </div>
        <div className="space-y-0">
          {[
{num:"01", label:tg("landing.step1")},
            {num:"02", label:tg("landing.step2")},
            {num:"03", label:tg("landing.step3")},
          ].map(item => (
            <div key={item.num} className="flex items-center gap-4 py-4"
              style={{borderTop:"1px solid var(--border)"}}>
              <div className="font-bold text-xl" style={{color:"var(--brand)",letterSpacing:"-0.02em"}}>{item.num}</div>
              <div className="text-sm" style={{color:"var(--t2)"}}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
