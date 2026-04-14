"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", orgName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, org_name: form.orgName } }
    });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/");
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        <div className="mb-10">
          <div className="font-mono text-2xl font-semibold tracking-wide text-ink mb-1">Sprintal</div>
          <div className="text-sm text-gray-400 font-mono uppercase tracking-widest">90-day free trial · No credit card</div>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          {[
            { label: "Your name", key: "name", type: "text", placeholder: "Jane Smith" },
            { label: "Company name", key: "orgName", type: "text", placeholder: "Acme Corp" },
            { label: "Work email", key: "email", type: "email", placeholder: "jane@acme.com" },
            { label: "Password", key: "password", type: "password", placeholder: "Min 8 characters" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block font-mono text-xs uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
              <input type={type} value={form[key as keyof typeof form]} onChange={set(key)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-lime-500 bg-white"
                placeholder={placeholder} required />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#AADC00] text-ink font-mono font-semibold text-sm rounded-lg hover:bg-[#88B200] transition-colors disabled:opacity-50">
            {loading ? "Creating account..." : "Start Free Trial"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          Your first sprint (90 days) is completely free.
        </p>
        <p className="mt-4 text-center text-sm text-gray-400">
          Have an account? <Link href="/auth/login" className="text-ink font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
