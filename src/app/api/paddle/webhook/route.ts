import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPeriodFromPriceId, getPlanFromPriceId } from "@/lib/billing";

export const dynamic = "force-dynamic";

function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  const signedPayload = `${ts}:${rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(h1, "utf8"), Buffer.from(digest, "utf8"));
}

function extractPriceId(data: any): string | null {
  return (
    data?.items?.[0]?.price?.id ??
    data?.items?.[0]?.price_id ??
    data?.price_id ??
    null
  );
}

function extractOrgId(data: any): string | null {
  return (
    data?.custom_data?.orgId ??
    data?.custom_data?.org_id ??
    data?.transaction?.custom_data?.orgId ??
    null
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
  const rawBody = await req.text();
  const signature = req.headers.get("Paddle-Signature");

  if (!secret) {
    console.error("paddle webhook: missing PADDLE_WEBHOOK_SECRET");
    return NextResponse.json({ received: true });
  }

  const valid = verifyWebhookSignature(rawBody, signature, secret);
  if (!valid) {
    console.error("paddle webhook: invalid signature");
    return NextResponse.json({ received: true });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = event?.event_type as string | undefined;
    const data = event?.data ?? {};

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const priceId = extractPriceId(data);
    const plan = getPlanFromPriceId(priceId);
    const period = getPeriodFromPriceId(priceId);
    const customerId = data?.customer_id ?? data?.customer?.id ?? null;
    const subscriptionId = data?.id ?? data?.subscription_id ?? null;
    const status = data?.status ?? null;
    const orgIdFromCustomData = extractOrgId(data);

    let orgId = orgIdFromCustomData;
    if (!orgId && subscriptionId) {
      const { data: orgLookup } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("paddle_subscription_id", subscriptionId)
        .limit(1)
        .maybeSingle();
      orgId = orgLookup?.id ?? null;
    }

    if (!orgId) {
      console.error("paddle webhook: could not resolve org id", eventType);
      return NextResponse.json({ received: true });
    }

    if (eventType === "subscription.activated") {
      await supabaseAdmin.from("organizations").update({
        ...(plan ? { plan } : {}),
        ...(period ? { plan_period: period } : {}),
        paddle_customer_id: customerId,
        paddle_subscription_id: subscriptionId,
        paddle_subscription_status: "active",
        plan_expires_at: null,
        trial_ends_at: null,
      }).eq("id", orgId);
    }

    if (eventType === "subscription.updated") {
      await supabaseAdmin.from("organizations").update({
        ...(plan ? { plan } : {}),
        ...(period ? { plan_period: period } : {}),
        paddle_subscription_status: status,
      }).eq("id", orgId);
    }

    if (eventType === "subscription.canceled") {
      const cancelAt =
        data?.scheduled_change?.effective_at ??
        data?.canceled_at ??
        data?.ends_at ??
        null;
      await supabaseAdmin.from("organizations").update({
        paddle_subscription_status: "canceled",
        plan_expires_at: cancelAt,
      }).eq("id", orgId);
    }

    if (eventType === "subscription.past_due") {
      await supabaseAdmin.from("organizations").update({
        paddle_subscription_status: "past_due",
      }).eq("id", orgId);

      const { data: ownerMembership } = await supabaseAdmin
        .from("org_members")
        .select("user_id")
        .eq("org_id", orgId)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();

      if (ownerMembership?.user_id) {
        await supabaseAdmin.from("notifications").insert({
          org_id: orgId,
          user_id: ownerMembership.user_id,
          type: "billing_past_due",
          priority: "urgent",
          title: "Billing issue: payment past due",
          body: "We could not process your latest payment. Update your payment method to avoid service interruption.",
          link: "/pricing",
          read: false,
          emailed: false,
        });
      }
    }
  } catch (error) {
    console.error("paddle webhook processing error", error);
  }

  return NextResponse.json({ received: true });
}
