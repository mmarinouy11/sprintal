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

async function incrementSyntacticWeighted(
  supabaseAdmin: SupabaseClient,
  orgId: string,
  month: string,
  delta: number
) {
  const { error } = await supabaseAdmin.rpc("increment_coach_usage", {
    p_org_id: orgId,
    p_month: month,
    p_syntactic: delta,
    p_semantic: 0,
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
        syntactic_calls: (row?.syntactic_calls ?? 0) + delta,
        semantic_calls: row?.semantic_calls ?? 0,
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

    const month = getMonth();
    let currentUsage = 0;
    if (limits.syntactic >= 0) {
      const { data: usage } = await supabaseAdmin
        .from("coach_usage")
        .select("syntactic_calls")
        .eq("org_id", orgId)
        .eq("month", month)
        .limit(1)
        .maybeSingle();
      currentUsage = usage?.syntactic_calls ?? 0;
      const remainingBudget = limits.syntactic - currentUsage;
      if (remainingBudget < 5) {
        return NextResponse.json({ observation: null, sources: [], limitReached: true });
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

    const callOnce = async (withWebSearch: boolean) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: SEMANTIC_COACH_SYSTEM,
          messages: [{ role: "user", content: userPrompt }],
          ...(withWebSearch
            ? {
                tools: [
                  {
                    type: "web_search_20250305",
                    name: "web_search",
                    max_uses: 5,
                  },
                ],
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false as const, error: data?.error?.message || res.statusText };
      }
      return { ok: true as const, data };
    };

    let text = "";
    let first = await callOnce(true);
    if (!first.ok || !extractAnthropicText(first.data)) {
      const second = await callOnce(false);
      if (!second.ok) {
        return NextResponse.json({
          observation: null,
          sources: [],
        });
      }
      text = extractAnthropicText(second.data);
    } else {
      text = extractAnthropicText(first.data);
    }

    if (!text) {
      return NextResponse.json({ observation: null, sources: [] });
    }

    const parsed = parseSemanticAssistantText(text);
    const observation =
      parsed.observation || text.replace(/\nSOURCES:[\s\S]*$/i, "").trim() || null;

    if (observation) {
      await incrementSyntacticWeighted(supabaseAdmin, orgId, month, 5);
    }

    return NextResponse.json({
      observation,
      sources: parsed.sources,
    });
  } catch {
    return NextResponse.json({ observation: null, sources: [] });
  }
}
