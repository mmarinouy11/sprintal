import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COACH_LIMITS, SEMANTIC_CREDIT_WEIGHT } from "@/types";
import type { Plan } from "@/types";
import {
  SEMANTIC_COACH_SYSTEM,
  SEMANTIC_BET_USER_PROMPT,
  SEMANTIC_PORTFOLIO_USER_PROMPT,
  SEMANTIC_REVIEW_USER_PROMPT,
  parseSemanticAssistantText,
  sprintElapsedFraction,
  type SemanticBetContext,
  type SemanticPortfolioContext,
  type SemanticReviewContext,
} from "@/lib/coach/semanticPrompts";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function getMonth() {
  return new Date().toISOString().slice(0, 7);
}

function localeLabel(locale: string): string {
  if (locale === "es") return "Spanish";
  if (locale === "pt") return "Portuguese";
  return "English";
}

function extractAnthropicText(payload: {
  content?: Array<{ type?: string; text?: string }>;
}): string {
  if (!payload?.content?.length) return "";
  const parts: string[] = [];
  for (const block of payload.content) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("\n\n").trim();
}

async function incrementCoachUsage(
  supabaseAdmin: SupabaseClient,
  orgId: string,
  month: string,
  syntacticDelta: number,
  semanticDelta: number
) {
  const { error } = await supabaseAdmin.rpc("increment_coach_usage", {
    p_org_id: orgId,
    p_month: month,
    p_syntactic: syntacticDelta,
    p_semantic: semanticDelta,
  });
  if (error) {
    const { data: row } = await supabaseAdmin
      .from("coach_usage")
      .select("syntactic_calls, semantic_calls")
      .eq("org_id", orgId)
      .eq("month", month)
      .limit(1)
      .maybeSingle();
    await supabaseAdmin.from("coach_usage").upsert(
      {
        org_id: orgId,
        month,
        syntactic_calls: (row?.syntactic_calls ?? 0) + syntacticDelta,
        semantic_calls: (row?.semantic_calls ?? 0) + semanticDelta,
      },
      { onConflict: "org_id,month" }
    );
  }
}

type CallOnceResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string }
  | { ok: false; aborted: true };

type AnthropicUsageSnapshot = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit({ key: `coach-semantic:${ip}`, limit: 10, windowMs: 60_000 });
  if (!allowed) return apiError("Too many requests.", 429);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return apiOk({ observation: null, sources: [] }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (!userData.user) {
      return apiOk({ observation: null, sources: [] }, { status: 401 });
    }

    const body = (await req.json()) as {
      analysisType: "bet" | "portfolio" | "review";
      locale: "en" | "es" | "pt";
      orgId: string;
      bet?: SemanticBetContext["bet"];
      sprint?: SemanticBetContext["sprint"];
      siblingBetSummaries?: string[];
      allBets?: SemanticPortfolioContext["bets"];
      orgName?: string;
      reviewWhatHappened?: string;
    };

    const { analysisType, locale, orgId } = body;
    if (!orgId || !analysisType) {
      return apiOk({ observation: null, sources: [] }, { status: 400 });
    }

    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("plan, coach_semantic_enabled, name")
      .eq("id", orgId)
      .limit(1)
      .maybeSingle();

    if (!orgRow?.coach_semantic_enabled) {
      return apiOk({ observation: null, sources: [] });
    }

    const plan = (orgRow.plan || "trial") as Plan;
    const limits = COACH_LIMITS[plan] || COACH_LIMITS.trial;

    if (limits.semantic === 0) {
      return apiOk({ observation: null, sources: [], limitReached: true });
    }

    if (analysisType === "portfolio") {
      const bets = body.allBets || [];
      const withHypothesis = bets.filter(
        (b) => typeof b.hypothesis === "string" && b.hypothesis.trim().length > 0
      );
      if (withHypothesis.length < 3) {
        return apiOk({
          observation: null,
          sources: [],
          insufficientContext: true,
        });
      }
    }

    const month = getMonth();
    let currentSyntacticUsage = 0;
    let currentSemanticUsage = 0;
    const totalCap = limits.totalCredits;
    const semanticCap = limits.semantic;

    if (
      orgId &&
      (totalCap >= 0 || (semanticCap >= 0 && semanticCap > 0))
    ) {
      const { data: usage } = await supabaseAdmin
        .from("coach_usage")
        .select("syntactic_calls, semantic_calls")
        .eq("org_id", orgId)
        .eq("month", month)
        .limit(1)
        .maybeSingle();
      currentSyntacticUsage = usage?.syntactic_calls ?? 0;
      currentSemanticUsage = usage?.semantic_calls ?? 0;
    }

    if (semanticCap >= 0 && semanticCap > 0 && currentSemanticUsage >= semanticCap) {
      return apiOk({
        observation: null,
        sources: [],
        limitReached: true,
        creditsRemaining:
          totalCap < 0 ? -1 : Math.max(0, totalCap - currentSyntacticUsage),
      });
    }

    if (totalCap >= 0 && currentSyntacticUsage + SEMANTIC_CREDIT_WEIGHT > totalCap) {
      return apiOk({
        observation: null,
        sources: [],
        limitReached: true,
        creditsRemaining: 0,
      });
    }

    const orgName = body.orgName?.trim() || orgRow.name || "Organization";
    const lang = localeLabel(locale);

    let userPrompt: string;
    if (analysisType === "portfolio") {
      const bets = body.allBets || [];
      const ctx: SemanticPortfolioContext = {
        orgName,
        sprint: body.sprint || null,
        bets,
      };
      userPrompt = SEMANTIC_PORTFOLIO_USER_PROMPT(lang, ctx);
    } else if (analysisType === "review" && body.bet && body.reviewWhatHappened) {
      const ctx: SemanticReviewContext = {
        orgName,
        bet: body.bet,
        sprint: body.sprint || null,
        siblingBetSummaries: body.siblingBetSummaries || [],
        sprintElapsedFraction: sprintElapsedFraction(
          body.sprint?.start_date,
          body.sprint?.end_date
        ),
        reviewWhatHappened: body.reviewWhatHappened.trim(),
      };
      userPrompt = SEMANTIC_REVIEW_USER_PROMPT(lang, ctx);
    } else if (analysisType === "bet" && body.bet) {
      const ctx: SemanticBetContext = {
        orgName,
        bet: body.bet,
        sprint: body.sprint || null,
        siblingBetSummaries: body.siblingBetSummaries || [],
        sprintElapsedFraction: sprintElapsedFraction(
          body.sprint?.start_date,
          body.sprint?.end_date
        ),
      };
      userPrompt = SEMANTIC_BET_USER_PROMPT(lang, ctx);
    } else {
      return apiOk({ observation: null, sources: [] }, { status: 400 });
    }

    const callOnce = async (withWebSearch: boolean, model: string): Promise<CallOnceResult> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 1200,
            system: SEMANTIC_COACH_SYSTEM,
            messages: [{ role: "user", content: userPrompt }],
            ...(withWebSearch
              ? {
                  tools: [
                    {
                      type: "web_search_20250305",
                      name: "web_search",
                    },
                  ],
                }
              : {}),
          }),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
          error?: { message?: string };
        };
        if (!res.ok) {
          return {
            ok: false as const,
            status: res.status,
            error: data?.error?.message || res.statusText,
          };
        }
        return { ok: true as const, data };
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return { ok: false as const, aborted: true as const };
        }
        throw e;
      } finally {
        clearTimeout(timeout);
      }
    };

    const models = [
      "claude-sonnet-4-5-20251022",
      "claude-sonnet-4-5",
      "claude-haiku-4-5-20251001",
    ] as const;
    let modelUsed: (typeof models)[number] | null = null;
    let text = "";
    let usageData: AnthropicUsageSnapshot | null = null;
    for (const model of models) {
      const first = await callOnce(true, model);
      if ("aborted" in first && first.aborted) {
        return apiOk({ observation: null, sources: [] });
      }
      if (first.ok && extractAnthropicText(first.data)) {
        console.log("anthropic usage object:", JSON.stringify(first.data?.usage));
        text = extractAnthropicText(first.data);
        usageData = (first.data?.usage as AnthropicUsageSnapshot) ?? null;
        modelUsed = model;
        break;
      }
      const second = await callOnce(false, model);
      if ("aborted" in second && second.aborted) {
        return apiOk({ observation: null, sources: [] });
      }
      if (second.ok && extractAnthropicText(second.data)) {
        console.log("anthropic usage object:", JSON.stringify(second.data?.usage));
        text = extractAnthropicText(second.data);
        usageData = (second.data?.usage as AnthropicUsageSnapshot) ?? null;
        modelUsed = model;
        break;
      }
      const firstModelNotFound = !first.ok && "status" in first && first.status === 404;
      const secondModelNotFound = !second.ok && "status" in second && second.status === 404;
      // If model not found/available, try next model.
      if (!firstModelNotFound && !secondModelNotFound) {
        break;
      }
    }

    if (!text) {
      return apiOk({ observation: null, sources: [] });
    }

    const parsed = parseSemanticAssistantText(text);
    const observation =
      parsed.observation || text.replace(/\nSOURCES:[\s\S]*$/i, "").trim() || null;
    const usage = usageData;
    console.log(
      JSON.stringify({
        coach: "semantic",
        analysis_type: analysisType,
        model: modelUsed,
        input_tokens: usage?.input_tokens ?? null,
        output_tokens: usage?.output_tokens ?? null,
        org_id: orgId,
        had_observation: observation !== null,
        sources_count: parsed.sources.length,
      })
    );

    let creditsRemaining =
      totalCap < 0
        ? -1
        : Math.max(0, totalCap - currentSyntacticUsage);
    if (observation) {
      await incrementCoachUsage(
        supabaseAdmin,
        orgId,
        month,
        SEMANTIC_CREDIT_WEIGHT,
        1
      );
      const updatedUnified = currentSyntacticUsage + SEMANTIC_CREDIT_WEIGHT;
      creditsRemaining =
        totalCap < 0 ? -1 : Math.max(0, totalCap - updatedUnified);
    }

    return apiOk({
      observation,
      sources: parsed.sources,
      modelUsed,
      creditsRemaining,
    });
  } catch {
    return apiOk({ observation: null, sources: [] });
  }
}
