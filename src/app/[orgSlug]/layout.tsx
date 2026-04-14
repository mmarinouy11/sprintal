"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import AppSidebar from "@/components/layout/AppSidebar";
import TrialBanner from "@/components/layout/TrialBanner";

export default function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string };
}) {
  const { setOrg, setSprints, setBets, setEvidence, setSignalChecks, setLoading, org } = useStore();

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Get org
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", params.orgSlug)
        .single();
      if (!orgData) { setLoading(false); return; }
      setOrg(orgData);
      // Load all data in parallel
      const [sp, bt, ev, sc] = await Promise.all([
        supabase.from("sprints").select("*").eq("org_id", orgData.id).order("created_at"),
        supabase.from("bets").select("*").eq("org_id", orgData.id).order("created_at"),
        supabase.from("evidence").select("*").eq("org_id", orgData.id).order("created_at", { ascending: false }),
        supabase.from("signal_checks").select("*").eq("org_id", orgData.id).order("created_at", { ascending: false }),
      ]);
      setSprints(sp.data || []);
      setBets(bt.data || []);
      setEvidence(ev.data || []);
      setSignalChecks(sc.data || []);
      setLoading(false);
    }
    load();
  }, [params.orgSlug]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <AppSidebar orgSlug={params.orgSlug} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {org && <TrialBanner org={org} />}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
