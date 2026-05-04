"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

async function loadOrgBundle(accessToken: string, orgSlug: string, fromSlug: string | null) {
  let bundle = await fetchOrgDataBundle(accessToken, orgSlug);
  // Parent / ancestor slugs are not in the user's membership list → org/data returns 404 (not 403).
  if (!bundle.ok && fromSlug && (bundle.status === 403 || bundle.status === 404)) {
    bundle = await fetchAncestorBundle(accessToken, orgSlug, fromSlug);
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from");
  const t = useT();
  /** Slug changes → full-screen load; same org, new path (p. ej. vuelta desde /pricing) → refresh sin bloquear UI */
  const lastLoadedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const fromParam = fromQuery;
      const slugChanged =
        lastLoadedSlugRef.current !== null && lastLoadedSlugRef.current !== params.orgSlug;
      const isInitial = lastLoadedSlugRef.current === null;
      lastLoadedSlugRef.current = params.orgSlug;

      if (slugChanged || isInitial) {
        setLoading(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        setLoading(false);
        return;
      }

      const first = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
      if (!first.ok) {
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
          const again = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
          if (!again.ok) break;
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

      const upgraded =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("upgraded") === "true";
      if (upgraded) {
        const initialPlan = orgData.plan;
        const initialSubId = orgData.paddle_subscription_id ?? null;
        for (let i = 0; i < 16; i++) {
          await new Promise((r) => setTimeout(r, 450));
          const again = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
          if (!again.ok) break;
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
        if (trialEnd < new Date() && pathname !== "/trial-expired") {
          router.replace("/trial-expired");
          setLoading(false);
          return;
        }
      }

      if (!ancestorReadOnly && !orgData.onboarding_complete) {
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
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json().catch(() => ({ notifications: [] }));
        setNotifications(notificationsData.notifications || []);
      } else {
        setNotifications([]);
      }

      setLoading(false);
    }
    load();
  }, [params.orgSlug, pathname, fromQuery, router, setOrg, setSprints, setBets, setEvidence, setSignalChecks, setLoading, setChildOrgs, setCurrentRole, setBetAlignments, setRootPlan, setNotifications, setParentOrg, setAncestorReadOnly, setMemberContextSlug, setMemberContextName]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fromParam = fromQuery;

    async function pullOrgBundle() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;
      const bundle = await loadOrgBundle(session.access_token, params.orgSlug, fromParam);
      if (!bundle.ok || !("data" in bundle)) return;
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
  }, [params.orgSlug, fromQuery, setOrg, setRootPlan, setCurrentRole, setChildOrgs, setParentOrg, setAncestorReadOnly, setMemberContextSlug, setMemberContextName]);

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
