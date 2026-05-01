import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FIELD_PROMPTS, SPRINT_DURATION_CONTEXT } from "@/lib/coach/prompts";
import { COACH_LIMITS } from "@/types";
import type { CoachField } from "@/lib/coach/useSyntacticCoach";
import type { Plan } from "@/types";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

function getMonth() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `coach:${ip}`, limit: 30, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return apiError("Unauthorized", 401);

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify JWT
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return apiError("Unauthorized", 401);

    const { field, value, sprintDays, locale, orgId, coachType = "syntactic" } = await req.json() as {
      field: CoachField;
      value: string;
      sprintDays?: number;
      locale?: string;
      orgId?: string;
      coachType?: "syntactic" | "semantic";
    };

    if (!field || !value || !FIELD_PROMPTS[field]) {
      return apiOk({ observation: null });
    }

    let org: {
      plan: Plan | null;
      coach_syntactic_enabled: boolean | null;
      coach_semantic_enabled: boolean | null;
    } | null = null;

    if (orgId) {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("plan, coach_syntactic_enabled, coach_semantic_enabled")
        .eq("id", orgId)
        .limit(1)
        .maybeSingle();
      org = data || null;
    }

    // Check coach toggles only when org context is available.
    if (org) {
      if (coachType === "syntactic" && !org.coach_syntactic_enabled) {
        return apiOk({ observation: null, disabled: true });
      }
      if (coachType === "semantic" && !org.coach_semantic_enabled) {
        return apiOk({ observation: null, disabled: true });
      }
    }

    // Check usage limits only when org context is available.
    const plan = ((org?.plan || "trial") as Plan);
    const limits = COACH_LIMITS[plan] || COACH_LIMITS["trial"];
    const totalCap = limits.totalCredits;
    const semanticCap = limits.semantic;

    if (coachType === "semantic" && semanticCap === 0) {
      return apiOk({ observation: null, limitReached: true, upgradeRequired: true });
    }

    if (orgId) {
      const month = getMonth();
      const { data: usage } = await supabaseAdmin
        .from("coach_usage")
        .select("syntactic_calls, semantic_calls")
        .eq("org_id", orgId)
        .eq("month", month)
        .limit(1)
        .maybeSingle();

      const unifiedUsed = usage?.syntactic_calls ?? 0;
      const semanticUsed = usage?.semantic_calls ?? 0;

      if (coachType === "syntactic" && totalCap >= 0 && unifiedUsed >= totalCap) {
        return apiOk({
          observation: null,
          limitReached: true,
          used: unifiedUsed,
          limit: totalCap,
          plan,
        });
      }
      if (
        coachType === "semantic" &&
        semanticCap > 0 &&
        semanticUsed >= semanticCap
      ) {
        return apiOk({
          observation: null,
          limitReached: true,
          used: semanticUsed,
          limit: semanticCap,
          plan,
        });
      }
      if (coachType === "semantic" && totalCap >= 0 && unifiedUsed + 1 > totalCap) {
        return apiOk({
          observation: null,
          limitReached: true,
          used: unifiedUsed,
          limit: totalCap,
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let data: {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    try {
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
        signal: controller.signal,
      });
      data = await res.json();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return apiOk({ observation: null });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    console.log("anthropic usage object:", JSON.stringify(data.usage));
    const text = data.content?.[0]?.text?.trim() || "";
    const observation = text === "NULL" || text === "" ? null : text;
    const usage = data.usage;
    console.log(
      JSON.stringify({
        coach: "formulation",
        field,
        model: "claude-haiku-4-5-20251001",
        input_tokens: usage?.input_tokens ?? null,
        output_tokens: usage?.output_tokens ?? null,
        org_id: orgId,
        had_observation: observation !== null,
      })
    );

    // Record usage if we got a real response
    if (observation !== null && orgId) {
      const month = getMonth();
      try {
        const { error } = await supabaseAdmin.rpc("increment_coach_usage", {
          p_org_id: orgId,
          p_month: month,
          p_syntactic: coachType === "syntactic" ? 1 : coachType === "semantic" ? 1 : 0,
          p_semantic: coachType === "semantic" ? 1 : 0,
        });
        if (error) {
          // Fallback: upsert manually
          await supabaseAdmin.from("coach_usage").upsert({
            org_id: orgId,
            month,
            syntactic_calls: coachType === "syntactic" ? 1 : coachType === "semantic" ? 1 : 0,
            semantic_calls: coachType === "semantic" ? 1 : 0,
          }, { onConflict: "org_id,month" });
        }
      } catch {
        // Silent fail — don't block the response
      }
    }

    return apiOk({ observation });
  } catch {
    return apiOk({ observation: null });
  }
}
