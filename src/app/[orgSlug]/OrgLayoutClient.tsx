"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  clearPendingPrimary,
  normalizeHexColor,
  readPendingPrimary,
} from "@/lib/orgPendingPrimary";
import AppSidebar from "@/components/layout/AppSidebar";
import TrialBanner from "@/components/layout/TrialBanner";
import TopBar from "@/components/layout/TopBar";
import { useT } from "@/lib/i18n";
import type { Organization, Sprint, Bet, Evidence, SignalCheck, BetAlignment, OrgRole } from "@/types";
import { orgLoadDebug } from "@/lib/debugOrgLoad";

async function fetchOrgDataBundle(accessToken: string, orgSlug: string) {
  const res = await fetch(
    `/api/org/data?slug=${encodeURIComponent(orgSlug)}&_ts=${Date.now()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return { ok: false as const, status: res.status };
  const data = await res.json();
  return { ok: true as const, data };
}

async function fetchAncestorBundle(accessToken: string, orgSlug: string, fromSlug: string) {
  const res = await fetch(
    `/api/org/ancestor-preview?slug=${encodeURIComponent(orgSlug)}&from=${encodeURIComponent(fromSlug)}&_ts=${Date.now()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return { ok: false as const, status: res.status };
  const data = await res.json();
  return { ok: true as const, data };
}

function readFromQueryParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("from");
}

async function loadOrgBundle(accessToken: string, orgSlug: string, fromSlug: string | null) {
  let bundle = await fetchOrgDataBundle(accessToken, orgSlug);
  orgLoadDebug("bundle: /api/org/data", {
    slug: orgSlug,
    ok: bundle.ok,
    status: bundle.ok ? 200 : bundle.status,
  });
  // Parent / ancestor slugs are not in the user's membership list → org/data returns 404 (not 403).
  if (!bundle.ok && fromSlug && (bundle.status === 403 || bundle.status === 404)) {
    orgLoadDebug("bundle: fallback /api/org/ancestor-preview", { slug: orgSlug, from: fromSlug });
    bundle = await fetchAncestorBundle(accessToken, orgSlug, fromSlug);
    orgLoadDebug("bundle: ancestor-preview result", {
      slug: orgSlug,
      ok: bundle.ok,
      status: bundle.ok ? 200 : bundle.status,
    });
  }
  return bundle;
}

type BundleData = {
  org: Organization;
  rootPlan: string;
  role: OrgRole | null;
  sprints: unknown[];
  bets: unknown[];
  evidence: unknown[];
  signalChecks: unknown[];
  children: Organization[];
  betAlignments: unknown[];
  parentOrg?: Organization | null;
  ancestorReadOnly?: boolean;
  memberContextSlug?: string | null;
  memberContextName?: string | null;
};

export default function OrgLayoutClient({
  children, params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const {
    setOrg, setSprints, setBets, setEvidence, setSignalChecks,
    setLoading, setChildOrgs, setCurrentRole, setBetAlignments, setRootPlan, org, setNotifications,
    setParentOrg, setAncestorReadOnly, setMemberContextSlug, setMemberContextName,
    ancestorReadOnly, memberContextSlug, memberContextName,
  } = useStore();
  const router = useRouter();
  const t = useT();
  /** Slug changes → full-screen load; same org, new path (p. ej. vuelta desde /pricing) → refresh sin bloquear UI */
  const lastLoadedSlugRef = useRef<string | null>(null);

  const loadGenerationRef = useRef(0);

  useEffect(() => {
    const gen = ++loadGenerationRef.current;
    async function load() {
      const fromParam = readFromQueryParam();
      const slugChanged =
        lastLoadedSlugRef.current !== null && lastLoadedSlugRef.current !== params.orgSlug;
      const isInitial = lastLoadedSlugRef.current === null;
      const showedFullScreenLoad = slugChanged || isInitial;
      lastLoadedSlugRef.current = params.orgSlug;

      orgLoadDebug("layout:load start", {
        gen,
        paramsSlug: params.orgSlug,
        fromParam,
        slugChanged,
        isInitial,
        showedFullScreenLoad,
        href: typeof window !== "undefined" ? window.location.href : "(ssr)",
      });

      if (showedFullScreenLoad) {
        setLoading(true);
        orgLoadDebug("layout:setLoading true", { gen, reason: "full-screen load" });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (gen !== loadGenerationRef.current) {
        orgLoadDebug("layout:aborted stale (post-session)", { gen, current: loadGenerationRef.current });
        if (showedFullScreenLoad) setLoading(false);
        return;
      }
      if (!session) {
        orgLoadDebug("layout:redirect no session → /auth/login", { gen });
        router.replace("/auth/login");
        setLoading(false);
        return;
      }

      const first = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
      if (gen !== loadGenerationRef.current) {
        orgLoadDebug("layout:aborted stale (post-bundle)", { gen, current: loadGenerationRef.current });
        if (showedFullScreenLoad) setLoading(false);
        return;
      }
      if (!first.ok) {
        orgLoadDebug("layout:bundle failed → redirect", {
          gen,
          status: first.status,
          to: first.status === 401 ? "/auth/login" : "/",
        });
        if (first.status === 401) {
          router.replace("/auth/login");
        } else {
          // Recover: wrong slug, stale session edge cases — let `/` pick home org instead of forcing login.
          router.replace("/");
        }
        setLoading(false);
        return;
      }

      let data = first.data as BundleData;
      let {
        org: orgData,
        rootPlan,
        role,
        sprints,
        bets,
        evidence,
        signalChecks,
        children: childOrgsList,
        betAlignments,
        parentOrg = null,
        ancestorReadOnly = false,
        memberContextSlug = null,
        memberContextName = null,
      } = data;

      orgLoadDebug("layout:bundle ok", {
        gen,
        orgId: orgData.id,
        orgSlug: orgData.slug,
        ancestorReadOnly,
        memberContextSlug,
        onboardingComplete: orgData.onboarding_complete,
      });

      const pending = readPendingPrimary(orgData.id);
      if (
        pending &&
        normalizeHexColor(orgData.primary_color) === normalizeHexColor(pending.hex)
      ) {
        clearPendingPrimary(orgData.id);
      } else if (
        pending &&
        normalizeHexColor(orgData.primary_color) !== normalizeHexColor(pending.hex)
      ) {
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 350 + i * 150));
          if (gen !== loadGenerationRef.current) break;
          const again = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
          if (!again.ok) break;
          if (gen !== loadGenerationRef.current) break;
          data = again.data as BundleData;
          orgData = data.org;
          rootPlan = data.rootPlan;
          role = data.role;
          sprints = data.sprints;
          bets = data.bets;
          evidence = data.evidence;
          signalChecks = data.signalChecks;
          childOrgsList = data.children;
          betAlignments = data.betAlignments;
          parentOrg = data.parentOrg ?? null;
          ancestorReadOnly = !!data.ancestorReadOnly;
          memberContextSlug = data.memberContextSlug ?? null;
          memberContextName = data.memberContextName ?? null;
          if (normalizeHexColor(orgData.primary_color) === normalizeHexColor(pending.hex)) {
            clearPendingPrimary(orgData.id);
            break;
          }
        }
        if (
          normalizeHexColor(orgData.primary_color) !== normalizeHexColor(pending.hex)
        ) {
          orgData = { ...orgData, primary_color: pending.hex };
          data = { ...data, org: orgData };
        }
      }

      if (gen !== loadGenerationRef.current) {
        if (showedFullScreenLoad) setLoading(false);
        return;
      }

      const upgraded =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("upgraded") === "true";
      if (upgraded) {
        const initialPlan = orgData.plan;
        const initialSubId = orgData.paddle_subscription_id ?? null;
        for (let i = 0; i < 16; i++) {
          await new Promise((r) => setTimeout(r, 450));
          if (gen !== loadGenerationRef.current) break;
          const again = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
          if (!again.ok) break;
          if (gen !== loadGenerationRef.current) break;
          data = again.data as BundleData;
          orgData = data.org;
          rootPlan = data.rootPlan;
          role = data.role;
          sprints = data.sprints;
          bets = data.bets;
          evidence = data.evidence;
          signalChecks = data.signalChecks;
          childOrgsList = data.children;
          betAlignments = data.betAlignments;
          parentOrg = data.parentOrg ?? null;
          ancestorReadOnly = !!data.ancestorReadOnly;
          memberContextSlug = data.memberContextSlug ?? null;
          memberContextName = data.memberContextName ?? null;
          const subNow = orgData.paddle_subscription_id ?? null;
          if (
            orgData.plan !== initialPlan ||
            (subNow && subNow !== initialSubId)
          ) {
            break;
          }
        }
      }

      if (gen !== loadGenerationRef.current) {
        if (showedFullScreenLoad) setLoading(false);
        return;
      }

      if (orgData.id !== org?.id) {
        setChildOrgs([]);
        setBetAlignments([]);
      }

      setOrg(orgData);
      setRootPlan(rootPlan || orgData.plan);
      setCurrentRole(role as OrgRole | null);
      setParentOrg(parentOrg ?? null);
      setAncestorReadOnly(!!ancestorReadOnly);
      setMemberContextSlug(memberContextSlug ?? null);
      setMemberContextName(memberContextName ?? null);

      if (orgData.plan === "trial" && orgData.trial_ends_at) {
        const trialEnd = new Date(orgData.trial_ends_at);
        const pathNow =
          typeof window !== "undefined" ? window.location.pathname : "";
        if (trialEnd < new Date() && pathNow !== "/trial-expired") {
          orgLoadDebug("layout:redirect trial expired", { gen, pathNow });
          router.replace("/trial-expired");
          setLoading(false);
          return;
        }
      }

      if (!ancestorReadOnly && !orgData.onboarding_complete) {
        orgLoadDebug("layout:redirect onboarding", { gen, slug: params.orgSlug });
        router.replace(`/onboarding/${params.orgSlug}`);
        setLoading(false);
        return;
      }

      setSprints(sprints as Sprint[]);
      setBets(bets as Bet[]);
      setEvidence(evidence as Evidence[]);
      setSignalChecks(signalChecks as SignalCheck[]);
      setChildOrgs(childOrgsList);
      setBetAlignments(betAlignments as BetAlignment[]);

      const notificationsRes = await fetch(
        `/api/notifications?orgId=${encodeURIComponent(orgData.id)}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (gen !== loadGenerationRef.current) {
        if (showedFullScreenLoad) setLoading(false);
        return;
      }
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json().catch(() => ({ notifications: [] }));
        if (gen !== loadGenerationRef.current) {
          if (showedFullScreenLoad) setLoading(false);
          return;
        }
        setNotifications(notificationsData.notifications || []);
      } else {
        setNotifications([]);
      }

      if (gen !== loadGenerationRef.current) {
        if (showedFullScreenLoad) setLoading(false);
        return;
      }
      orgLoadDebug("layout:setLoading false (success)", { gen, orgSlug: params.orgSlug });
      setLoading(false);
    }
    void load().catch((err: unknown) => {
      orgLoadDebug("layout:load threw", {
        gen,
        currentGen: loadGenerationRef.current,
        message: err instanceof Error ? err.message : String(err),
      });
      if (gen === loadGenerationRef.current) setLoading(false);
    });
  }, [params.orgSlug, router, setOrg, setSprints, setBets, setEvidence, setSignalChecks, setLoading, setChildOrgs, setCurrentRole, setBetAlignments, setRootPlan, setNotifications, setParentOrg, setAncestorReadOnly, setMemberContextSlug, setMemberContextName]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function pullOrgBundle() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;
      orgLoadDebug("layout:pullOrgBundle (focus/visibility)", { slug: params.orgSlug });
      const bundle = await loadOrgBundle(
        session.access_token,
        params.orgSlug,
        readFromQueryParam()
      );
      if (!bundle.ok || !("data" in bundle)) {
        orgLoadDebug("layout:pullOrgBundle skip (not ok)", {
          slug: params.orgSlug,
          status: bundle.ok ? 200 : bundle.status,
        });
        return;
      }
      const d = bundle.data as BundleData;
      setOrg(d.org);
      setRootPlan(d.rootPlan || d.org.plan);
      setCurrentRole(d.role as OrgRole | null);
      setChildOrgs(d.children);
      setParentOrg(d.parentOrg ?? null);
      setAncestorReadOnly(!!d.ancestorReadOnly);
      setMemberContextSlug(d.memberContextSlug ?? null);
      setMemberContextName(d.memberContextName ?? null);
    }

    function scheduleRefresh() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void pullOrgBundle();
      }, 400);
    }

    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", scheduleRefresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", scheduleRefresh);
    };
  }, [params.orgSlug, setOrg, setRootPlan, setCurrentRole, setChildOrgs, setParentOrg, setAncestorReadOnly, setMemberContextSlug, setMemberContextName]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar orgSlug={params.orgSlug} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar orgSlug={params.orgSlug} />
        {org && ancestorReadOnly && memberContextSlug && (
          <div
            style={{
              flexShrink: 0,
              padding: "8px 24px",
              fontSize: "0.875rem",
              fontFamily: "var(--font-body)",
              color: "var(--t2)",
              background: "color-mix(in srgb, var(--brand) 6%, transparent)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{t("layout.readOnlyAncestor", { org: org.name })}</span>
            <Link
              href={`/${memberContextSlug}/dashboard`}
              style={{
                color: "var(--brand)",
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {t("layout.readOnlySwitchTo", { member: memberContextName || memberContextSlug })}
            </Link>
          </div>
        )}
        {org && <TrialBanner org={org} />}
        <main className="flex-1 overflow-y-auto w-full" style={{ background: "var(--bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
