"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import AppSidebar from "@/components/layout/AppSidebar";
import TrialBanner from "@/components/layout/TrialBanner";
import TopBar from "@/components/layout/TopBar";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => clamp(v, 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function adjustRgb({ r, g, b }: { r: number; g: number; b: number }, amount: number) {
  return {
    r: clamp(Math.round(r + (255 - r) * amount), 0, 255),
    g: clamp(Math.round(g + (255 - g) * amount), 0, 255),
    b: clamp(Math.round(b + (255 - b) * amount), 0, 255),
  };
}

function darkenRgb({ r, g, b }: { r: number; g: number; b: number }, amount: number) {
  return {
    r: clamp(Math.round(r * (1 - amount)), 0, 255),
    g: clamp(Math.round(g * (1 - amount)), 0, 255),
    b: clamp(Math.round(b * (1 - amount)), 0, 255),
  };
}

function applyBrandTheme(primaryColor?: string) {
  const root = document.documentElement;
  const rgb = primaryColor ? hexToRgb(primaryColor) : null;
  if (!rgb) return;

  const dark = darkenRgb(rgb, 0.2);
  const light = adjustRgb(rgb, 0.9);

  root.style.setProperty("--brand", primaryColor);
  root.style.setProperty("--brand-dk", rgbToHex(dark.r, dark.g, dark.b));
  root.style.setProperty("--brand-lt", rgbToHex(light.r, light.g, light.b));
  root.style.setProperty("--brand-bg", `rgba(${rgb.r},${rgb.g},${rgb.b},0.07)`);
  root.style.setProperty("--brand-mid", `rgba(${rgb.r},${rgb.g},${rgb.b},0.20)`);
}

export default function OrgLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const {
    setOrg, setSprints, setBets, setEvidence, setSignalChecks,
    setLoading, setChildOrgs, setCurrentRole, setBetAlignments, setRootPlan, org,
  } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Get session token to call API Route
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        setLoading(false);
        return;
      }

      // Fetch all org data via API Route (uses service_role — bypasses RLS correctly)
      const res = await fetch(`/api/org/data?slug=${params.orgSlug}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        if (res.status === 401) router.replace("/auth/login");
        if (res.status === 403) router.replace("/auth/login");
        if (res.status === 404) router.replace("/auth/login");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const { org: orgData, rootPlan, role, sprints, bets, evidence, signalChecks, children, betAlignments } = data;

      // Reset store if switching orgs
      if (orgData.id !== org?.id) {
        setChildOrgs([]);
        setBetAlignments([]);
      }

      setOrg(orgData);
      applyBrandTheme(orgData.primary_color);
      console.log("layout setOrg — plan:", orgData.plan, "full org:", JSON.stringify(orgData).slice(0, 200));
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
      setLoading(false);
    }
    load();
  }, [params.orgSlug]);

  useEffect(() => {
    applyBrandTheme(org?.primary_color);
  }, [org?.primary_color]);

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
