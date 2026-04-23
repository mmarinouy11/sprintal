import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  /** Org id + all descendants (parent_org_id chain). */
  async function collectOrgTreeIds(rootIds: string[]): Promise<string[]> {
    if (rootIds.length === 0) return [];
    const all = new Set<string>(rootIds);
    let frontier = [...rootIds];
    while (frontier.length > 0) {
      const { data: children, error } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .in("parent_org_id", frontier);
      if (error) throw error;
      const next = (children ?? []).map((r: { id: string }) => r.id).filter((id) => !all.has(id));
      if (next.length === 0) break;
      next.forEach((id) => all.add(id));
      frontier = next;
    }
    return Array.from(all);
  }

  const nowIso = new Date().toISOString();
  /** Day 120: delete data when trial_ends_at is before (now − 30 days). */
  const cleanupCutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let cleanupOrgIds: string[] = [];
  try {
    // ── Phase 1: close Active sprints for trial orgs past trial_ends_at (day 90) ──
    const { data: expiredTrialRoots, error: expErr } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("plan", "trial")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", nowIso);

    if (expErr) throw expErr;

    const closeOrgIds = await collectOrgTreeIds(
      (expiredTrialRoots ?? []).map((r: { id: string }) => r.id)
    );

    let sprintsClosed = 0;
    if (closeOrgIds.length > 0) {
      const { data: updated, error: sprintErr } = await supabaseAdmin
        .from("sprints")
        .update({ status: "Closed" })
        .in("org_id", closeOrgIds)
        .eq("status", "Active")
        .select("id");
      if (sprintErr) throw sprintErr;
      sprintsClosed = updated?.length ?? 0;
    }

    // ── Phase 2: delete strategic data 30 days after trial end ──
    const { data: cleanupRoots, error: clErr } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("plan", "trial")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", cleanupCutoffIso);

    if (clErr) throw clErr;

    cleanupOrgIds = await collectOrgTreeIds(
      (cleanupRoots ?? []).map((r: { id: string }) => r.id)
    );

    if (cleanupOrgIds.length > 0) {
      const { data: betRows, error: betSelErr } = await supabaseAdmin
        .from("bets")
        .select("id")
        .in("org_id", cleanupOrgIds);
      if (betSelErr) throw betSelErr;
      const betIds = (betRows ?? []).map((b: { id: string }) => b.id);

      const chunk = 200;
      for (let i = 0; i < betIds.length; i += chunk) {
        const slice = betIds.slice(i, i + chunk);
        const { error: ba1 } = await supabaseAdmin.from("bet_alignments").delete().in("child_bet_id", slice);
        if (ba1) throw ba1;
        const { error: ba2 } = await supabaseAdmin.from("bet_alignments").delete().in("parent_bet_id", slice);
        if (ba2) throw ba2;
      }

      const { error: evErr } = await supabaseAdmin.from("evidence").delete().in("org_id", cleanupOrgIds);
      if (evErr) throw evErr;

      const { error: scErr } = await supabaseAdmin.from("signal_checks").delete().in("org_id", cleanupOrgIds);
      if (scErr) throw scErr;

      const { error: betDelErr } = await supabaseAdmin.from("bets").delete().in("org_id", cleanupOrgIds);
      if (betDelErr) throw betDelErr;

      const { error: spErr } = await supabaseAdmin.from("sprints").delete().in("org_id", cleanupOrgIds);
      if (spErr) throw spErr;

      const { error: cuErr } = await supabaseAdmin.from("coach_usage").delete().in("org_id", cleanupOrgIds);
      if (cuErr) throw cuErr;
    }

    return NextResponse.json({
      ok: true,
      sprintsClosed,
      cleanupOrgCount: cleanupOrgIds.length,
      message: "Organizations and members preserved; strategic data removed for expired+30d trial trees.",
    });
  } catch (e) {
    console.error("cleanup-expired cron:", e);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
