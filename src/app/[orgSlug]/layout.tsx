"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import AppSidebar from "@/components/layout/AppSidebar";
import TrialBanner from "@/components/layout/TrialBanner";
import TopBar from "@/components/layout/TopBar";

export default function OrgLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const {
    setOrg, setSprints, setBets, setEvidence, setSignalChecks,
    setLoading, setChildOrgs, setCurrentRole, setBetAlignments, org,
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
      const { org: orgData, role, sprints, bets, evidence, signalChecks, children, betAlignments } = data;

      // Reset store if switching orgs
      if (orgData.id !== org?.id) {
        setChildOrgs([]);
        setBetAlignments([]);
      }

      setOrg(orgData);
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
