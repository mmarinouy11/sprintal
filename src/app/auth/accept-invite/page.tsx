"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

/** Survives React Strict Mode double-mount after we strip the hash from the URL. */
const INVITE_HASH_TOKENS_KEY = "sprintal_invite_hash_tokens_v1";

function parseHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(raw);
}

function decodeParam(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

/** Supabase may return errors in the hash (implicit) or query string (some redirects). */
function readAuthErrors(): {
  error: string | null;
  errorCode: string | null;
  errorDescription: string;
} {
  const hash = parseHashParams();
  const q =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const error = hash.get("error") || q.get("error");
  const errorCode = hash.get("error_code") || q.get("error_code");
  const errorDescription = decodeParam(
    hash.get("error_description") || q.get("error_description")
  );
  return { error, errorCode, errorDescription };
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

/**
 * Supabase hosted /auth/v1/verify often redirects with tokens in the hash (implicit-style).
 * @supabase/ssr createBrowserClient forces flowType "pkce", so initializing the client while
 * that hash is still present causes a flow mismatch and can clear / block the session.
 * We capture tokens and strip the hash synchronously, then load the Supabase module.
 */
function takeImplicitHashTokens():
  | { access_token: string; refresh_token: string }
  | null {
  if (typeof window === "undefined") return null;
  const pending = sessionStorage.getItem(INVITE_HASH_TOKENS_KEY);
  if (pending) {
    sessionStorage.removeItem(INVITE_HASH_TOKENS_KEY);
    try {
      const o = JSON.parse(pending) as { access_token?: string; refresh_token?: string };
      if (o.access_token && o.refresh_token) return o as { access_token: string; refresh_token: string };
    } catch {
      /* ignore */
    }
  }
  const params = parseHashParams();
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  sessionStorage.setItem(
    INVITE_HASH_TOKENS_KEY,
    JSON.stringify({ access_token, refresh_token })
  );
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  );
  return { access_token, refresh_token };
}

export default function AcceptInvitePage() {
  const t = useT("auth");
  const tg = useT();
  const [phase, setPhase] = useState<"loading" | "error" | "redirecting">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const { error: hashOrQueryError, errorCode, errorDescription } = readAuthErrors();
    const implicitTokens = !hashOrQueryError && !errorCode ? takeImplicitHashTokens() : null;

    async function processInvite() {
      if (hashOrQueryError || errorCode) {
        let message = errorDescription;
        if (errorCode === "otp_expired") {
          message = t("inviteOtpExpired");
        } else if (hashOrQueryError === "access_denied") {
          message = message || t("inviteAccessDenied");
        }
        if (!message) message = t("inviteErrorGeneric");
        if (!cancelled) {
          setErrorMessage(message);
          setPhase("error");
        }
        return;
      }

      const { supabase } = await import("@/lib/supabase");

      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session && implicitTokens) {
        const { error: sessionError } = await supabase.auth.setSession(implicitTokens);
        sessionStorage.removeItem(INVITE_HASH_TOKENS_KEY);
        if (sessionError) {
          if (!cancelled) {
            setErrorMessage(sessionError.message || t("inviteSessionError"));
            setPhase("error");
          }
          return;
        }
        ({
          data: { session },
        } = await supabase.auth.getSession());
      }

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (!session && code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        ({
          data: { session },
        } = await supabase.auth.getSession());
        if (!session && exchangeError) {
          if (!cancelled) {
            setErrorMessage(exchangeError.message || t("inviteSessionError"));
            setPhase("error");
          }
          return;
        }
      }

      if (!session) {
        if (!cancelled) {
          setErrorMessage(t("inviteInvalidLink"));
          setPhase("error");
        }
        return;
      }

      if (!cancelled) {
        setPhase("redirecting");
        const orgId = new URLSearchParams(window.location.search).get("orgId")?.trim();
        stripAuthParamsFromUrl();

        if (orgId) {
          try {
            const res = await fetch(
              `/api/org/invite-target?orgId=${encodeURIComponent(orgId)}`,
              {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: "no-store",
              }
            );
            if (res.ok) {
              const body = (await res.json()) as { slug?: string };
              if (body.slug) {
                window.location.replace(
                  `/auth/set-password?orgSlug=${encodeURIComponent(body.slug)}`
                );
                return;
              }
            }
          } catch {
            /* fall through to / */
          }
        }

        window.location.replace("/");
      }
    }

    processInvite();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
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

          {phase === "loading" && (
            <div className="space-y-4">
              <div className="font-semibold text-lg" style={{ color: "var(--text)" }}>
                {t("acceptInviteTitle")}
              </div>
              <p className="t-mono text-sm" style={{ color: "var(--t2)" }}>
                {t("acceptInviteSubtitle")}
              </p>
              <div
                className="flex justify-center py-8"
                aria-hidden
              >
                <div
                  className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
                />
              </div>
            </div>
          )}

          {phase === "redirecting" && (
            <div className="space-y-4">
              <div className="font-semibold text-lg" style={{ color: "var(--text)" }}>
                {t("acceptInviteTitle")}
              </div>
              <p className="t-mono text-sm" style={{ color: "var(--t2)" }}>
                {t("acceptInviteSubtitle")}
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-4">
              <div className="font-semibold text-lg" style={{ color: "var(--text)" }}>
                {t("acceptInviteTitle")}
              </div>
              <div
                className="t-mono text-sm p-3 rounded"
                style={{
                  background: "rgba(220,38,38,0.06)",
                  color: "#DC2626",
                  border: "1px solid rgba(220,38,38,0.12)",
                }}
              >
                {errorMessage}
              </div>
              <Link
                href="/auth/login"
                className="btn-primary w-full py-2.5 inline-block text-center"
                style={{ textDecoration: "none" }}
              >
                {t("backToLogin")}
              </Link>
            </div>
          )}
        </div>
      </div>

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
              <div className="font-bold text-xl" style={{ color: "var(--brand)", letterSpacing: "-0.02em" }}>
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
