import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const admin = getAdmin();
  const { data } = await admin.auth.getUser(token);
  return data.user || null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = getAdmin();
  const orgId = req.nextUrl.searchParams.get("orgId");
  let query = admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(20);
  if (orgId) query = query.eq("org_id", orgId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = getAdmin();
  const body = (await req.json().catch(() => ({}))) as {
    ids?: string[];
    all?: boolean;
    orgId?: string;
  };

  if (body.all) {
    let query = admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (body.orgId) query = query.eq("org_id", body.orgId);
    const { error } = await query;
    if (error) return NextResponse.json({ error: "Failed to mark all read." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const ids = body.ids || [];
  if (!ids.length) return NextResponse.json({ ok: true });
  const { error } = await admin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .in("id", ids);
  if (error) return NextResponse.json({ error: "Failed to mark read." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
