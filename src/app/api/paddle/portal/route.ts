import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `paddle-portal:${ip}`, limit: 20, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  const token = req.headers.get("authorization")?.replace("Bearer ", "") || "";
  if (!token) return apiError("Unauthorized.", 401);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return apiError("Unauthorized.", 401);
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

  if (!orgId) return apiError("Organization not found.", 404);

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return apiError("Forbidden.", 403);

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("id", orgId)
    .limit(1)
    .maybeSingle();

  if (!org?.paddle_customer_id) {
    return apiError("No Paddle customer for organization.", 400);
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return apiError("Missing Paddle API key.", 500);

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
    return apiError("Failed to create customer portal session.", 502);
  }

  const url = payload?.data?.urls?.general?.overview ?? payload?.data?.url ?? null;
  if (!url) return apiError("Portal URL unavailable.", 502);

  return apiOk({ url });
}
