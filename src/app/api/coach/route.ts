import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FIELD_PROMPTS, SPRINT_DURATION_CONTEXT } from "@/lib/coach/prompts";
import { COACH_LIMITS } from "@/types";
import type { CoachField } from "@/lib/coach/useSyntacticCoach";
import type { Plan } from "@/types";

function getMonth() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify JWT
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { field, value, sprintDays, locale, orgId, coachType = "syntactic" } = await req.json() as {
      field: CoachField;
      value: string;
      sprintDays?: number;
      locale?: string;
      orgId: string;
      coachType?: "syntactic" | "semantic";
    };

    if (!field || !value || !FIELD_PROMPTS[field] || !orgId) {
      return NextResponse.json({ observation: null });
    }

    // Get org plan and coach settings
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("plan, coach_syntactic_enabled, coach_semantic_enabled")
      .eq("id", orgId)
      .limit(1)
      .single();

    if (!org) return NextResponse.json({ observation: null });

    // Check if coach is enabled for this org
    if (coachType === "syntactic" && !org.coach_syntactic_enabled) {
      return NextResponse.json({ observation: null, disabled: true });
    }
    if (coachType === "semantic" && !org.coach_semantic_enabled) {
      return NextResponse.json({ observation: null, disabled: true });
    }

    // Check usage limits
    const plan = org.plan as Plan;
    const limits = COACH_LIMITS[plan];
    const limit = coachType === "syntactic" ? limits.syntactic : limits.semantic;

    if (limit === 0) {
      return NextResponse.json({ observation: null, limitReached: true, upgradeRequired: true });
    }

    if (limit > 0) { // -1 = unlimited
      const month = getMonth();
      const { data: usage } = await supabaseAdmin
        .from("coach_usage")
        .select("syntactic_calls, semantic_calls")
        .eq("org_id", orgId)
        .eq("month", month)
        .limit(1)
        .maybeSingle();

      const currentCalls = coachType === "syntactic"
        ? (usage?.syntactic_calls || 0)
        : (usage?.semantic_calls || 0);

      if (currentCalls >= limit) {
        return NextResponse.json({
          observation: null,
          limitReached: true,
          used: currentCalls,
          limit,
          plan,
        });
      }
    }

    // Call Anthropic
    const lang = locale === "es" ? "Spanish" : locale === "pt" ? "Portuguese" : "English";
    const languageInstruction = `\n\nRespond in ${lang}. If returning NULL, always return exactly: NULL`;
    const systemPrompt = (sprintDays
      ? `${FIELD_PROMPTS[field]}\n\n${SPRINT_DURATION_CONTEXT(sprintDays)}`
      : FIELD_PROMPTS[field]) + languageInstruction;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: "user", content: value.trim() }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const observation = text === "NULL" || text === "" ? null : text;

    // Record usage if we got a real response
    if (observation !== null) {
      const month = getMonth();
      try {
        const { error } = await supabaseAdmin.rpc("increment_coach_usage", {
          p_org_id: orgId,
          p_month: month,
          p_syntactic: coachType === "syntactic" ? 1 : 0,
          p_semantic: coachType === "semantic" ? 1 : 0,
        });
        if (error) {
          // Fallback: upsert manually
          await supabaseAdmin.from("coach_usage").upsert({
            org_id: orgId,
            month,
            syntactic_calls: coachType === "syntactic" ? 1 : 0,
            semantic_calls: coachType === "semantic" ? 1 : 0,
          }, { onConflict: "org_id,month" });
        }
      } catch {
        // Silent fail — don't block the response
      }
    }

    return NextResponse.json({ observation });
  } catch {
    return NextResponse.json({ observation: null });
  }
}
