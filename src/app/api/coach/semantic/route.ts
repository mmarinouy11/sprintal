import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COACH_LIMITS } from "@/types";
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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ observation: null, sources: [] }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (!userData.user) {
      return NextResponse.json({ observation: null, sources: [] }, { status: 401 });
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
      return NextResponse.json({ observation: null, sources: [] }, { status: 400 });
    }

    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("plan, coach_semantic_enabled, name")
      .eq("id", orgId)
      .limit(1)
      .maybeSingle();

    if (!orgRow?.coach_semantic_enabled) {
      return NextResponse.json({ observation: null, sources: [] });
    }

    const plan = (orgRow.plan || "trial") as Plan;
    const limits = COACH_LIMITS[plan] || COACH_LIMITS.trial;

    if (limits.semantic === 0) {
      return NextResponse.json({ observation: null, sources: [], limitReached: true });
    }

    if (analysisType === "portfolio") {
      const bets = body.allBets || [];
      const withHypothesis = bets.filter(
        (b) => typeof b.hypothesis === "string" && b.hypothesis.trim().length > 0
      );
      if (withHypothesis.length < 3) {
        return NextResponse.json({
          observation: null,
          sources: [],
          insufficientContext: true,
        });
      }
    }

    const month = getMonth();
    let currentSyntacticUsage = 0;
    let currentSemanticUsage = 0;
    const unifiedLimit = limits.syntactic;
    if (limits.syntactic >= 0) {
      const { data: usage } = await supabaseAdmin
        .from("coach_usage")
        .select("syntactic_calls, semantic_calls")
        .eq("org_id", orgId)
        .eq("month", month)
        .limit(1)
        .maybeSingle();
      currentSyntacticUsage = usage?.syntactic_calls ?? 0;
      currentSemanticUsage = usage?.semantic_calls ?? 0;
      const totalUsed = currentSyntacticUsage + currentSemanticUsage * 5;
      const remainingBudget = limits.syntactic - totalUsed;
      if (remainingBudget < 5) {
        return NextResponse.json({
          observation: null,
          sources: [],
          limitReached: true,
          creditsRemaining: 0,
        });
      }
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
      return NextResponse.json({ observation: null, sources: [] }, { status: 400 });
    }

    const callOnce = async (withWebSearch: boolean, model: string) => {
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
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false as const,
          status: res.status,
          error: data?.error?.message || res.statusText,
        };
      }
      return { ok: true as const, data };
    };

    const models = [
      "claude-sonnet-4-5-20251022",
      "claude-sonnet-4-5",
      "claude-haiku-4-5-20251001",
    ] as const;
    let modelUsed: (typeof models)[number] | null = null;
    let text = "";
    for (const model of models) {
      const first = await callOnce(true, model);
      if (first.ok && extractAnthropicText(first.data)) {
        text = extractAnthropicText(first.data);
        modelUsed = model;
        break;
      }
      const second = await callOnce(false, model);
      if (second.ok && extractAnthropicText(second.data)) {
        text = extractAnthropicText(second.data);
        modelUsed = model;
        break;
      }
      const firstModelNotFound = !first.ok && first.status === 404;
      const secondModelNotFound = !second.ok && second.status === 404;
      // If model not found/available, try next model.
      if (!firstModelNotFound && !secondModelNotFound) {
        break;
      }
    }

    if (!text) {
      return NextResponse.json({ observation: null, sources: [] });
    }

    const parsed = parseSemanticAssistantText(text);
    const observation =
      parsed.observation || text.replace(/\nSOURCES:[\s\S]*$/i, "").trim() || null;

    let creditsRemaining =
      unifiedLimit === -1
        ? -1
        : Math.max(
            0,
            unifiedLimit - (currentSyntacticUsage + currentSemanticUsage * 5)
          );
    if (observation) {
      await incrementCoachUsage(supabaseAdmin, orgId, month, 0, 1);
      const updatedTotal = currentSyntacticUsage + (currentSemanticUsage + 1) * 5;
      creditsRemaining =
        unifiedLimit === -1 ? -1 : Math.max(0, unifiedLimit - updatedTotal);
    }

    return NextResponse.json({
      observation,
      sources: parsed.sources,
      modelUsed,
      creditsRemaining,
    });
  } catch {
    return NextResponse.json({ observation: null, sources: [] });
  }
}
