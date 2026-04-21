import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limit: 300 requests per IP per minute (generous for normal use)
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `org-data:${ip}`, limit: 300, windowMs: 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Create fresh client per request — avoids stale connection cache
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log("getUser result:", user?.id, "error:", authError?.message, "token prefix:", token?.slice(0, 20));
    if (authError || !user) return NextResponse.json({ error: "No autorizado.", debug: authError?.message }, { status: 401 });

    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "slug requerido." }, { status: 400 });

    // Load org — avoid .single() which may cache
    const { data: orgRows } = await supabaseAdmin
      .from("organizations").select("*").eq("slug", slug).limit(1);
    const org = orgRows?.[0] ?? null;
    console.log("ORG PLAN DEBUG (no single):", org?.id, org?.plan, new Date().toISOString());
    if (!org) return NextResponse.json({ error: "Org no encontrada." }, { status: 404 });

    // Verify membership
    const { data: member } = await supabaseAdmin
      .from("org_members").select("role")
      .eq("org_id", org.id).eq("user_id", user.id).maybeSingle();
    if (!member) return NextResponse.json({ error: "Sin acceso." }, { status: 403 });

    // Load everything in parallel
    const [sprintsRes, betsRes, evidenceRes, signalChecksRes, childrenRes] = await Promise.all([
      supabaseAdmin.from("sprints").select("*").eq("org_id", org.id).order("created_at"),
      supabaseAdmin.from("bets").select("*").eq("org_id", org.id).order("created_at"),
      supabaseAdmin.from("evidence").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("signal_checks").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("organizations").select("*").eq("parent_org_id", org.id).order("cascade_level"),
    ]);

    const bets = betsRes.data || [];
    let betAlignments: unknown[] = [];
    if (bets.length > 0) {
      const { data: alData } = await supabaseAdmin
        .from("bet_alignments").select("*")
        .in("child_bet_id", bets.map((b: { id: string }) => b.id));
      betAlignments = alData || [];
    }

    return NextResponse.json({
      org,
      role: member.role,
      sprints: sprintsRes.data || [],
      bets,
      evidence: evidenceRes.data || [],
      signalChecks: signalChecksRes.data || [],
      children: childrenRes.data || [],
      betAlignments,
    });

  } catch (err) {
    console.error("org/data error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
