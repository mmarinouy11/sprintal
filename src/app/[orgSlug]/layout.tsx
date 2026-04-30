"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
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

export default function OrgLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const {
    setOrg, setSprints, setBets, setEvidence, setSignalChecks,
    setLoading, setChildOrgs, setCurrentRole, setBetAlignments, setRootPlan, org, setNotifications,
  } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  /** Slug changes → full-screen load; same org, new path (p. ej. vuelta desde /pricing) → refresh sin bloquear UI */
  const lastLoadedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const slugChanged =
        lastLoadedSlugRef.current !== null && lastLoadedSlugRef.current !== params.orgSlug;
      const isInitial = lastLoadedSlugRef.current === null;
      lastLoadedSlugRef.current = params.orgSlug;

      if (slugChanged || isInitial) {
        setLoading(true);
      }

      // Get session token to call API Route
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        setLoading(false);
        return;
      }

      const first = await fetchOrgDataBundle(session.access_token, params.orgSlug);
      if (!first.ok) {
        if (first.status === 401) router.replace("/auth/login");
        if (first.status === 403) router.replace("/auth/login");
        if (first.status === 404) router.replace("/auth/login");
        setLoading(false);
        return;
      }

      let data = first.data;
      let { org: orgData, rootPlan, role, sprints, bets, evidence, signalChecks, children, betAlignments } = data;

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
          const again = await fetchOrgDataBundle(session.access_token, params.orgSlug);
          if (!again.ok) break;
          data = again.data;
          orgData = data.org;
          rootPlan = data.rootPlan;
          role = data.role;
          sprints = data.sprints;
          bets = data.bets;
          evidence = data.evidence;
          signalChecks = data.signalChecks;
          children = data.children;
          betAlignments = data.betAlignments;
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

      // Paddle webhook can arrive a few seconds after redirect; poll until DB reflects the purchase.
      const upgraded =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("upgraded") === "true";
      if (upgraded) {
        const initialPlan = orgData.plan;
        const initialSubId = orgData.paddle_subscription_id ?? null;
        for (let i = 0; i < 16; i++) {
          await new Promise((r) => setTimeout(r, 450));
          const again = await fetchOrgDataBundle(session.access_token, params.orgSlug);
          if (!again.ok) break;
          data = again.data;
          orgData = data.org;
          rootPlan = data.rootPlan;
          role = data.role;
          sprints = data.sprints;
          bets = data.bets;
          evidence = data.evidence;
          signalChecks = data.signalChecks;
          children = data.children;
          betAlignments = data.betAlignments;
          const subNow = orgData.paddle_subscription_id ?? null;
          if (
            orgData.plan !== initialPlan ||
            (subNow && subNow !== initialSubId)
          ) {
            break;
          }
        }
      }

      // Reset store if switching orgs
      if (orgData.id !== org?.id) {
        setChildOrgs([]);
        setBetAlignments([]);
      }

      setOrg(orgData);
      setRootPlan(rootPlan || orgData.plan);
      setCurrentRole(role);

      // Trial enforcement — redirect if trial expired
      if (orgData.plan === "trial" && orgData.trial_ends_at) {
        const trialEnd = new Date(orgData.trial_ends_at);
        if (trialEnd < new Date() && pathname !== "/trial-expired") {
          router.replace("/trial-expired");
          setLoading(false);
          return;
        }
      }

      // Redirect to onboarding if needed — outside this layout to avoid loops
      if (!orgData.onboarding_complete) {
        router.replace(`/onboarding/${params.orgSlug}`);
        setLoading(false);
        return;
      }

      // Redirect leaf orgs (no children) to parent
      if (children.length === 0 && orgData.parent_org_id) {
        const { data: parentOrgs } = await supabase
          .from("organizations").select("slug")
          .eq("id", orgData.parent_org_id).limit(1);
        const parentOrg = parentOrgs?.[0];
        if (parentOrg) {
          router.replace(`/${parentOrg.slug}/dashboard`);
          setLoading(false);
          return;
        }
      }

      setSprints(sprints);
      setBets(bets);
      setEvidence(evidence);
      setSignalChecks(signalChecks);
      setChildOrgs(children);
      setBetAlignments(betAlignments);

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
  }, [params.orgSlug, pathname]);

  // Misma org y misma ruta: p. ej. pricing en otra pestaña → volver aquí sin remount
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;

    async function pullOrgBundle() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;
      const bundle = await fetchOrgDataBundle(session.access_token, params.orgSlug);
      if (!bundle.ok || !("data" in bundle)) return;
      const d = bundle.data;
      setOrg(d.org);
      setRootPlan(d.rootPlan || d.org.plan);
      setCurrentRole(d.role);
      setChildOrgs(d.children);
    }

    function scheduleRefresh() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(t);
      t = setTimeout(() => {
        void pullOrgBundle();
      }, 400);
    }

    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", scheduleRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", scheduleRefresh);
    };
  }, [params.orgSlug, setOrg, setRootPlan, setCurrentRole, setChildOrgs]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar orgSlug={params.orgSlug} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar orgSlug={params.orgSlug} />
        {org && <TrialBanner org={org} />}
        <main className="flex-1 overflow-y-auto w-full" style={{ background: "var(--bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
