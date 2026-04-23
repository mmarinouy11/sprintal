"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT("auth");

  const orgSlug = searchParams.get("orgSlug")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!orgSlug) {
        router.replace("/auth/login");
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: userRow, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!session || userErr || !userRow.user) {
        await supabase.auth.signOut();
        router.replace("/auth/login");
        return;
      }
      setCheckingSession(false);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    window.location.replace(`/${orgSlug}/dashboard`);
  }

  if (checkingSession) {
    return (
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div
            className="font-extrabold text-3xl tracking-tight mb-1"
            style={{ color: "var(--brand)", letterSpacing: "-0.03em" }}
          >
            Sprintal
          </div>
          <div className="t-label">Strategic Portfolio Management</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="font-semibold text-lg" style={{ color: "var(--text)" }}>
            {t("setPasswordTitle")}
          </div>
          <p className="t-mono text-sm" style={{ color: "var(--t2)" }}>
            {t("setPasswordSubtitle")}
          </p>
          <div>
            <label className="t-label block mb-2">{t("passwordLabel")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="t-label block mb-2">{t("confirmPasswordLabel")}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {error && (
            <div
              className="t-mono text-sm p-3 rounded"
              style={{
                background: "rgba(220,38,38,0.06)",
                color: "#DC2626",
                border: "1px solid rgba(220,38,38,0.12)",
              }}
            >
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
            {loading ? t("settingPassword") : t("setPasswordBtn")}
          </button>
        </form>

        <p className="mt-8 t-mono text-center" style={{ color: "var(--t3)" }}>
          <Link
            href="/auth/login"
            className="underline underline-offset-2 font-medium"
            style={{ color: "var(--brand)" }}
          >
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  const tg = useT();

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center px-8 py-12">
            <div
              className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
              aria-hidden
            />
          </div>
        }
      >
        <SetPasswordForm />
      </Suspense>

      <div
        className="hidden lg:flex w-96 flex-col justify-between p-12"
        style={{ background: "var(--sidebar)", borderLeft: "1px solid var(--border)" }}
      >
        <div>
          <div className="t-label mb-6" style={{ color: "var(--brand)" }}>
            {tg("landing.tagline")}
          </div>
          <div
            className="font-extrabold text-4xl leading-tight mb-6"
            style={{ color: "var(--text)", letterSpacing: "-0.03em" }}
          >
            {tg("landing.headline").split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </div>
          <p className="text-base leading-relaxed" style={{ color: "var(--t2)" }}>
            {tg("landing.desc")}
          </p>
        </div>
        <div className="space-y-0">
          {[
            { num: "01", label: tg("landing.step1") },
            { num: "02", label: tg("landing.step2") },
            { num: "03", label: tg("landing.step3") },
          ].map((item) => (
            <div
              key={item.num}
              className="flex items-center gap-4 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div
                className="font-bold text-xl"
                style={{ color: "var(--brand)", letterSpacing: "-0.02em" }}
              >
                {item.num}
              </div>
              <div className="text-sm" style={{ color: "var(--t2)" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
