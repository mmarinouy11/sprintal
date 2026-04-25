import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { addDays, parseISO } from "date-fns";

export const dynamic = "force-dynamic";
type Priority = "urgent" | "important" | "info";

type OrgRecipient = { user_id: string; role: string; email: string | null };

const DIGEST_OVERDUE_TYPES = new Set([
  "signal_check_due",
  "review_due",
  "weak_bet_no_decision",
  "parent_alert",
]);
const DIGEST_DUE_WEEK_TYPES = new Set([
  "sprint_expiring",
  "draft_incomplete",
  "invite_accepted",
]);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const requestedTestMode = req.nextUrl.searchParams.get("test") === "true";
  const isProduction = process.env.VERCEL_ENV === "production";
  const hasExplicitTestHeader = req.headers.get("x-test-mode") === "true";
  if (requestedTestMode && isProduction && !hasExplicitTestHeader) {
    return NextResponse.json(
      { error: "Test mode is blocked in production without X-Test-Mode: true." },
      { status: 403 }
    );
  }
  const testMode = requestedTestMode && (!isProduction || hasExplicitTestHeader);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  /** org_members has no email column — resolve from Auth Admin API. */
  async function fetchEmailsForUserIds(userIds: string[]): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>();
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    await Promise.all(
      unique.map(async (uid) => {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (error) {
          console.error("notifications cron: getUserById failed", uid, error.message ?? error);
          map.set(uid, null);
          return;
        }
        map.set(uid, data.user?.email ?? null);
      })
    );
    return map;
  }

  async function sendEmail(to: string, subject: string, html: string) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ to, subject, html }),
      });
      if (!res.ok) {
        console.error("notification email HTTP error:", res.status, await res.text().catch(() => ""));
        return false;
      }
      return true;
    } catch (e) {
      console.error("notification email failed:", e);
      return false;
    }
  }

  async function notificationExists(orgId: string, userId: string, type: string, link: string) {
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("type", type)
      .eq("link", link)
      .eq("read", false)
      .limit(1)
      .maybeSingle();
    return Boolean(data?.id);
  }

  /** Same resource as sprint_expiring: do not re-notify within `days` even if user marked read. */
  async function notificationExistsRecent(
    orgId: string,
    userId: string,
    type: string,
    link: string,
    days: number
  ) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("type", type)
      .eq("link", link)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    return Boolean(data?.id);
  }

  function hasStrategicReviewAfterMilestone(args: {
    evidence: { bet_id: string; created_at: string }[];
    sprintBetIds: Set<string>;
    milestoneInstant: Date;
  }) {
    const t = args.milestoneInstant.getTime();
    return args.evidence.some(
      (ev) =>
        args.sprintBetIds.has(ev.bet_id) && new Date(ev.created_at).getTime() >= t
    );
  }

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function createNotification(input: {
    orgId: string;
    userId: string;
    type: string;
    priority: Priority;
    title: string;
    body: string;
    link: string;
    email?: string | null;
    /** Skip if any notification (read or unread) for same keys in last N days. */
    dedupeRecentDays?: number;
  }) {
    if (input.dedupeRecentDays && input.dedupeRecentDays > 0) {
      const recent = await notificationExistsRecent(
        input.orgId,
        input.userId,
        input.type,
        input.link,
        input.dedupeRecentDays
      );
      if (recent) return;
    }
    const exists = await notificationExists(input.orgId, input.userId, input.type, input.link);
    if (exists) return;
    const { data: created, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        org_id: input.orgId,
        user_id: input.userId,
        type: input.type,
        priority: input.priority,
        title: input.title,
        body: input.body,
        link: input.link,
      })
      .select("id")
      .limit(1)
      .maybeSingle();
    if (insertError) {
      console.error("notifications cron: insert failed", insertError);
    }
    if (created?.id && input.email) {
      const sent = await sendEmail(
        input.email,
        input.title,
        `<div style="font-family:Inter,Arial,sans-serif;color:#111">
          <h3 style="color:#5C6AC4;margin:0 0 12px 0">Sprintal</h3>
          <p style="margin:0 0 8px 0">${input.body}</p>
          <p style="margin:12px 0 0 0"><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}${input.link}" style="color:#5C6AC4">Open in Sprintal</a></p>
        </div>`
      );
      if (sent) {
        await supabaseAdmin.from("notifications").update({ emailed: true }).eq("id", created.id);
      }
    }
  }

  function daysBetween(from: string, to: string) {
    const ms = new Date(to).getTime() - new Date(from).getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }

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

    // ── Phase 3: generate notifications for active orgs ──
    const { data: activeOrgs } = await supabaseAdmin
      .from("organizations")
      .select("id,slug,name,plan,trial_ends_at")
      .or(`plan.neq.trial,and(plan.eq.trial,trial_ends_at.gt.${nowIso})`);

    const orgs = activeOrgs ?? [];

    for (const org of orgs) {
      const membersResult = await supabaseAdmin
        .from("org_members")
        .select("user_id, role")
        .eq("org_id", org.id)
        .in("role", ["owner", "admin"]);
      if (membersResult.error) {
        console.error("notifications cron: org_members query failed", org.id, membersResult.error);
      }
      const memberRows = membersResult.data ?? [];
      const emailByUserId = await fetchEmailsForUserIds(
        memberRows.map((m: { user_id: string }) => m.user_id)
      );
      const recipients: OrgRecipient[] = memberRows
        .filter((m: { user_id: string }) => Boolean(m.user_id))
        .map((m: { user_id: string; role: string }) => ({
          user_id: m.user_id,
          role: m.role,
          email: emailByUserId.get(m.user_id) ?? null,
        }));
      if (!recipients.length) continue;

      const [betsRes, sprintsRes, signalChecksRes, evidenceRes] = await Promise.all([
        supabaseAdmin.from("bets").select("*").eq("org_id", org.id),
        supabaseAdmin.from("sprints").select("*").eq("org_id", org.id),
        supabaseAdmin.from("signal_checks").select("*").eq("org_id", org.id),
        supabaseAdmin.from("evidence").select("*").eq("org_id", org.id),
      ]);
      const bets = betsRes.data || [];
      const sprints = sprintsRes.data || [];
      const signalChecks = signalChecksRes.data || [];
      const evidence = evidenceRes.data || [];
      const activeSprints = sprints.filter((s: { status: string }) => s.status === "Active");

      // 1) draft_incomplete
      for (const bet of bets.filter((b: { is_draft: boolean }) => b.is_draft)) {
        const ageDays = daysBetween(bet.created_at, nowIso);
        if (ageDays < 1) continue;
        for (const r of recipients) {
          await createNotification({
            orgId: org.id,
            userId: r.user_id,
            type: "draft_incomplete",
            priority: "info",
            title: "Incomplete bet draft",
            body: `"${bet.name}" was created during onboarding but hasn't been completed.`,
            link: `/${org.slug}/bets/board?bet=${bet.id}`,
            email: r.email || null,
          });
        }
      }

      // 2) signal_check_due + 3) review_due + 4) sprint_expiring + 5) weak_bet_no_decision
      const now = new Date();
      for (const sprint of activeSprints) {
        const durationDays = Math.max(1, daysBetween(sprint.start_date, sprint.end_date));
        const signalInterval = testMode ? 1 : Math.max(1, Math.floor(durationDays / 6));
        const sprintStart = parseISO(sprint.start_date);
        const sprintEnd = parseISO(sprint.end_date);
        const sprintToEnd = Math.max(0, daysBetween(nowIso, sprint.end_date));
        const sprintBets = bets.filter(
          (b: { sprint_id: string; status: string }) =>
            b.sprint_id === sprint.id && b.status === "Active"
        );
        const sprintBetIds = new Set(sprintBets.map((b: { id: string }) => b.id));

        for (const bet of sprintBets) {
          const checks = signalChecks
            .filter((sc: { bet_id: string }) => sc.bet_id === bet.id)
            .sort((a: { created_at: string }, b: { created_at: string }) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          const lastCheck = checks[0];
          const daysNoCheck = lastCheck
            ? daysBetween(lastCheck.created_at, nowIso)
            : daysBetween(bet.created_at, nowIso);
          if (daysNoCheck >= signalInterval) {
            for (const r of recipients) {
              await createNotification({
                orgId: org.id,
                userId: r.user_id,
                type: "signal_check_due",
                priority: "important",
                title: "Signal check overdue",
                body: `"${bet.name}" hasn't had a signal check in ${daysNoCheck} days.`,
                link: `/${org.slug}/new/signal?bet=${bet.id}`,
                email: r.email || null,
              });
            }
          }
        }

        // Strategic review milestones: notify from (milestone − 2 days) through sprint end if no review evidence yet.
        const milestones = [33, 66, 90] as const;
        for (const pct of milestones) {
          const dayAt = Math.floor((durationDays * pct) / 100);
          const windowOpen = addDays(sprintStart, Math.max(0, dayAt - 2));
          const milestoneInstant = addDays(sprintStart, dayAt);
          const isFirstMilestone = pct === 33;
          const bypassWindowForTest = testMode && isFirstMilestone;
          if (!bypassWindowForTest && (now < windowOpen || now > sprintEnd)) continue;
          const reviewed = hasStrategicReviewAfterMilestone({
            evidence,
            sprintBetIds,
            milestoneInstant,
          });
          if (!reviewed) {
            for (const r of recipients) {
              await createNotification({
                orgId: org.id,
                userId: r.user_id,
                type: "review_due",
                priority: "important",
                title: "Strategic review due",
                body: `${sprint.name} has reached ${pct}% - a strategic review is due.`,
                link: `/${org.slug}/new/review?sprint=${sprint.id}&m=${pct}`,
                email: r.email || null,
              });
            }
          }
        }

        const sprintExpiringThresholdDays = testMode ? 30 : 7;
        if (sprintToEnd <= sprintExpiringThresholdDays && sprintToEnd >= 0) {
          const expiringLink = `/${org.slug}/sprints?sprint=${sprint.id}`;
          for (const r of recipients) {
            await createNotification({
              orgId: org.id,
              userId: r.user_id,
              type: "sprint_expiring",
              priority: "important",
              title: "Sprint ending soon",
              body: `"${sprint.name}" ends in ${sprintToEnd} days.`,
              link: expiringLink,
              email: r.email || null,
              dedupeRecentDays: 7,
            });
          }
        }

        const weakThreshold = testMode ? 1 : Math.max(1, Math.floor(durationDays / 3));
        const weakBets = sprintBets.filter((b: { signal: string }) => b.signal === "Weak");
        for (const bet of weakBets) {
          const weakChecks = signalChecks
            .filter(
              (sc: { bet_id: string; signal: string }) =>
                sc.bet_id === bet.id && sc.signal === "Weak"
            )
            .sort((a: { created_at: string }, b: { created_at: string }) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          const weakSince =
            weakChecks[0]?.created_at || bet.updated_at || bet.created_at;
          const weakDays = daysBetween(weakSince, nowIso);
          if (weakDays < weakThreshold) continue;
          for (const r of recipients) {
            await createNotification({
              orgId: org.id,
              userId: r.user_id,
              type: "weak_bet_no_decision",
              priority: "urgent",
              title: "Weak signal - decision needed",
              body: `"${bet.name}" has been Weak for ${weakDays} days without a decision.`,
              link: `/${org.slug}/bets/board?bet=${bet.id}`,
              email: r.email || null,
            });
          }
        }
      }

      // 6) parent_alert
      for (const bet of bets.filter((b: { parent_alert: boolean }) => b.parent_alert)) {
        if (!bet.parent_alert_status) continue;
        for (const r of recipients) {
          await createNotification({
            orgId: org.id,
            userId: r.user_id,
            type: "parent_alert",
            priority: "urgent",
            title: "Parent bet updated",
            body: `A parent bet for "${bet.name}" was ${bet.parent_alert_status}. Review this bet.`,
            link: `/${org.slug}/bets/board?bet=${bet.id}`,
            email: r.email || null,
          });
        }
      }

      // 7) invite_accepted (last 1 day)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: newMembers } = await supabaseAdmin
        .from("org_members")
        .select("user_id,created_at")
        .eq("org_id", org.id)
        .gte("created_at", oneDayAgo);
      const newMemberIds = (newMembers ?? [])
        .map((nm: { user_id: string }) => nm.user_id)
        .filter(Boolean);
      const inviteEmailByUserId = await fetchEmailsForUserIds(newMemberIds);
      for (const nm of newMembers ?? []) {
        const nmEmail = inviteEmailByUserId.get(nm.user_id) ?? null;
        for (const r of recipients) {
          if (r.user_id === nm.user_id) continue;
          await createNotification({
            orgId: org.id,
            userId: r.user_id,
            type: "invite_accepted",
            priority: "info",
            title: "New member joined",
            body: `${nmEmail || "A new user"} accepted the invitation and joined ${org.name}.`,
            link: `/${org.slug}/settings`,
          });
        }
      }
    }

    // Monday digest (UTC): overdue / due this week / portfolio — skip if all empty
    if (new Date().getUTCDay() === 1) {
      const { data: memberRows } = await supabaseAdmin
        .from("org_members")
        .select("user_id")
        .not("user_id", "is", null)
        .limit(8000);
      const digestUserIds = Array.from(
        new Set(
          (memberRows ?? [])
            .map((r: { user_id: string }) => r.user_id)
            .filter(Boolean)
        )
      );
      const digestEmailByUserId = await fetchEmailsForUserIds(digestUserIds);
      const userEmail = new Map<string, string>();
      for (const uid of digestUserIds) {
        const em = digestEmailByUserId.get(uid);
        if (em) userEmail.set(uid, em);
      }
      for (const [userId, email] of Array.from(userEmail.entries())) {
        try {
          const { data: unread } = await supabaseAdmin
            .from("notifications")
            .select("type,title,body,created_at")
            .eq("user_id", userId)
            .eq("read", false)
            .order("created_at", { ascending: false })
            .limit(80);
          const items = unread ?? [];
          const overdue = items.filter((n: { type: string }) => DIGEST_OVERDUE_TYPES.has(n.type));
          const dueWeek = items.filter((n: { type: string }) => DIGEST_DUE_WEEK_TYPES.has(n.type));

          const { data: orgIdsRows } = await supabaseAdmin
            .from("org_members")
            .select("org_id")
            .eq("user_id", userId);
          const orgIds = Array.from(
            new Set((orgIdsRows ?? []).map((r: { org_id: string }) => r.org_id).filter(Boolean))
          );

          const sprintExpiredLines: { title: string; body: string | null }[] = [];
          if (orgIds.length > 0) {
            const { data: expiredSprints } = await supabaseAdmin
              .from("sprints")
              .select("name,end_date")
              .in("org_id", orgIds)
              .eq("status", "Active")
              .lt("end_date", nowIso);
            for (const sp of expiredSprints ?? []) {
              sprintExpiredLines.push({
                title: `Sprint "${sp.name}" has passed its end date`,
                body: `End date was ${sp.end_date}. Close or update the sprint in Sprintal.`,
              });
            }
          }
          let portfolioHtml = "";
          let hasActivePortfolio = false;
          if (orgIds.length > 0) {
            const { data: orgs } = await supabaseAdmin
              .from("organizations")
              .select("id,name")
              .in("id", orgIds);
            const { data: activeBets } = await supabaseAdmin
              .from("bets")
              .select("org_id,signal,parent_alert,status")
              .in("org_id", orgIds)
              .eq("status", "Active");
            const orgNameById = new Map((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
            const byOrg = new Map<
              string,
              { strong: number; unclear: number; weak: number; pending: number }
            >();
            for (const oid of orgIds) {
              byOrg.set(oid, { strong: 0, unclear: 0, weak: 0, pending: 0 });
            }
            for (const b of activeBets ?? []) {
              const bucket = byOrg.get(b.org_id);
              if (!bucket) continue;
              hasActivePortfolio = true;
              if (b.signal === "Strong") bucket.strong += 1;
              else if (b.signal === "Unclear") bucket.unclear += 1;
              else if (b.signal === "Weak") bucket.weak += 1;
              if (b.signal === "Weak" || b.parent_alert) bucket.pending += 1;
            }
            const lines: string[] = [];
            for (const oid of orgIds) {
              const name = orgNameById.get(oid) || "Area";
              const c = byOrg.get(oid)!;
              const total = c.strong + c.unclear + c.weak;
              if (total === 0 && c.pending === 0) continue;
              lines.push(
                `<li><strong>${escapeHtml(name)}</strong> — Strong ${c.strong}, Unclear ${c.unclear}, Weak ${c.weak}; pending decisions: ${c.pending}</li>`
              );
            }
            portfolioHtml =
              lines.length > 0
                ? `<h3 style="margin-top:18px">Portfolio status</h3><ul>${lines.join("")}</ul>`
                : "";
          }

          const listItems = (rows: { title: string; body: string | null }[]) =>
            rows.length > 0
              ? rows
                  .map(
                    (n) =>
                      `<li>${escapeHtml(n.title)}${n.body ? ` — ${escapeHtml(n.body)}` : ""}</li>`
                  )
                  .join("")
              : "<li>None</li>";

          const overdueForEmail = [
            ...overdue.map((n: { title: string; body: string | null }) => ({
              title: n.title,
              body: n.body,
            })),
            ...sprintExpiredLines,
          ];

          if (
            overdueForEmail.length === 0 &&
            dueWeek.length === 0 &&
            !hasActivePortfolio &&
            portfolioHtml === ""
          ) {
            continue;
          }

          const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111;line-height:1.45">
          <h2 style="color:#5C6AC4;margin:0 0 12px 0">Sprintal — Weekly digest</h2>
          <h3 style="margin:16px 0 8px 0">Overdue</h3>
          <ul style="margin:0;padding-left:20px">${listItems(overdueForEmail)}</ul>
          <h3 style="margin:16px 0 8px 0">Due this week</h3>
          <ul style="margin:0;padding-left:20px">${listItems(
            dueWeek.map((n: { title: string; body: string | null }) => ({
              title: n.title,
              body: n.body,
            }))
          )}</ul>
          ${
            portfolioHtml ||
            (hasActivePortfolio
              ? `<h3 style="margin-top:18px">Portfolio status</h3><p>Active bets in your areas — open Sprintal for details.</p>`
              : "")
          }
          <p style="margin-top:20px;color:#555;font-size:14px"><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}" style="color:#5C6AC4">Open Sprintal</a></p>
        </div>`;
          await sendEmail(email, "Sprintal — Weekly digest", html);
        } catch (digestErr) {
          console.error("weekly digest user:", userId, digestErr);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sprintsClosed,
      cleanupOrgCount: cleanupOrgIds.length,
      notifications: true,
      message: "Organizations and members preserved; strategic data removed for expired+30d trial trees.",
    });
  } catch (e) {
    console.error("cleanup-expired cron:", e);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
