import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || "";
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const orgIdQuery = req.nextUrl.searchParams.get("orgId");

  let orgId = orgIdQuery;
  if (!orgId) {
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", authData.user.id)
      .limit(1)
      .maybeSingle();
    orgId = member?.org_id ?? null;
  }

  if (!orgId) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("id", orgId)
    .limit(1)
    .maybeSingle();

  if (!org?.paddle_customer_id) {
    return NextResponse.json({ error: "No Paddle customer for organization." }, { status: 400 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing Paddle API key." }, { status: 500 });

  const paddleRes = await fetch(
    `https://api.paddle.com/customers/${encodeURIComponent(org.paddle_customer_id)}/portal-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        org.paddle_subscription_id
          ? { subscription_ids: [org.paddle_subscription_id] }
          : {}
      ),
      cache: "no-store",
    }
  );

  const payload = await paddleRes.json().catch(() => ({}));
  if (!paddleRes.ok) {
    return NextResponse.json({ error: "Failed to create customer portal session." }, { status: 502 });
  }

  const url = payload?.data?.urls?.general?.overview ?? payload?.data?.url ?? null;
  if (!url) return NextResponse.json({ error: "Portal URL unavailable." }, { status: 502 });

  return NextResponse.json({ url });
}
