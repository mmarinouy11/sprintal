/** Shared system instructions for Claude Sonnet + optional web search. */

export const SEMANTIC_COACH_SYSTEM = `You are Sprintal Semantic Coach — a strategic advisor with deep knowledge of business strategy, product management, and portfolio governance and market dynamics.
You are neutral: you do not override business authority, but you give clear, evidence-informed recommendations grounded ONLY in the context provided.
Always respond in the user's language as specified in the request.

Output rules:
- Produce ONE integrated observation.
- Structure the observation for readability using clear paragraphs separated by double newlines.
- Use bullet points ONLY for lists of 3 or more distinct items.
- If using bullets, use "-" and maximum 4 bullet points.
- If making fewer than 3 bullet points, use paragraphs instead.
- Each bullet must be a complete, standalone observation (never a sentence fragment or continuation).
- Keep each sentence on a single line. Do not break sentences with line breaks.
- Maximum 4 sentences OR 4 bullet points in the observation body.
- Cover internal coherence (hypothesis vs kill/scale vs indicators vs signal vs sprint timing vs duplication vs alignment vs portfolio balance) AND, when useful, external context from web search (trends, benchmarks, research).
- If web search yields nothing relevant, rely on internal coherence only — do not apologize at length.
- When using web_search: run maximum 1-2 targeted searches. Use short, specific queries (4-6 words). Do not search for general background — only search for specific market data relevant to the bet outcome.
- Do NOT insert citations inline within sentences.
- Never use parenthetical citations like (McKinsey, 2024) inline.
- Sources must always go at the end, prefixed with ↗ and separated from the observation body.
- After the observation, output source lines exactly like:
↗ [Title](url)
↗ [Title](url)
Use real URLs only when web search returned them; if there are no reliable sources, output exactly: ↗ (none)

Infer industry/sector only from organization name and bet content — never ask the user questions.`;

export type SemanticBetContext = {
  orgName: string;
  bet: {
    name: string;
    outcome: string;
    hypothesis: string;
    kill_criteria: string;
    scale_trigger: string;
    indicators: string[];
    signal: string;
    status: string;
    bet_type: string;
    revenue: string;
    margin: string;
    importance: string;
  };
  sprint: {
    name: string;
    focus: string;
    signals: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
  siblingBetSummaries: string[];
  sprintElapsedFraction?: number;
};

export type SemanticPortfolioContext = {
  orgName: string;
  sprint: {
    name: string;
    focus: string;
    signals: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
  bets: Array<{
    name: string;
    outcome: string;
    hypothesis: string;
    signal: string;
    status: string;
    bet_type: string;
    revenue: string;
    margin: string;
    importance: string;
    owner_area: string;
  }>;
};

export type SemanticReviewContext = SemanticBetContext & {
  reviewWhatHappened: string;
};

export function trunc(s: string | null | undefined, max = 200): string {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "[...]" : s;
}

function formatBetForPrompt(bet: SemanticBetContext["bet"]): string {
  const ind = bet.indicators?.length ? bet.indicators.join(", ") : "—";
  return [
    `Bet: ${bet.name}`,
    `Outcome: ${bet.outcome || "—"}`,
    `Hypothesis: ${trunc(bet.hypothesis, 200)}`,
    `Kill if: ${trunc(bet.kill_criteria, 200)}`,
    `Scale when: ${trunc(bet.scale_trigger, 200)}`,
    `Indicators: ${ind}`,
    `Signal: ${bet.signal} | Status: ${bet.status} | Type: ${bet.bet_type}`,
    `Impact: Revenue=${bet.revenue} Margin=${bet.margin} Importance=${bet.importance}`,
  ].join("\n");
}

function formatSprintForPrompt(
  sprint: SemanticBetContext["sprint"] | null
): string {
  if (!sprint) return "Sprint: (none)";
  return [
    `Sprint: ${sprint.name} | ${sprint.start_date} → ${sprint.end_date} | ${sprint.status}`,
    `Focus: ${trunc(sprint.focus, 150)}`,
    `Signals: ${trunc(sprint.signals, 150)}`,
  ].join("\n");
}

function formatPortfolioBetLine(
  bet: SemanticPortfolioContext["bets"][number]
): string {
  return `- ${bet.name} | ${bet.signal} | ${bet.status} | ${bet.bet_type} | Owner: ${bet.owner_area} | Revenue=${bet.revenue}`;
}

export function SEMANTIC_BET_USER_PROMPT(
  localeLabel: string,
  ctx: SemanticBetContext
): string {
  const siblings =
    ctx.siblingBetSummaries.length > 0
      ? ctx.siblingBetSummaries.join(" | ")
      : "(none in same sprint)";
  const elapsed =
    ctx.sprintElapsedFraction !== undefined
      ? String(Math.round(ctx.sprintElapsedFraction * 100)) + "%"
      : "unknown";

  return `Language: ${localeLabel}

Organization: ${ctx.orgName}

${formatBetForPrompt(ctx.bet)}

${formatSprintForPrompt(ctx.sprint)}

Other bets in this sprint (for duplication / alignment): ${siblings}

Approximate sprint time elapsed (if inferred from dates): ${elapsed}`;
}

export function SEMANTIC_PORTFOLIO_USER_PROMPT(
  localeLabel: string,
  ctx: SemanticPortfolioContext
): string {
  const betLines = ctx.bets.map(formatPortfolioBetLine).join("\n");
  return `Language: ${localeLabel}

Organization: ${ctx.orgName}

${formatSprintForPrompt(ctx.sprint)}

Active bets:
${betLines || "—"}

Analyze portfolio balance (revenue / margin / capability mix, risk distribution), coherence with sprint strategic focus, and duplication across bets.`;
}

export function SEMANTIC_REVIEW_USER_PROMPT(
  localeLabel: string,
  ctx: SemanticReviewContext
): string {
  const base = SEMANTIC_BET_USER_PROMPT(localeLabel, ctx);
  return `${base}

Strategic review — "What happened" (evidence):
"""
${trunc(ctx.reviewWhatHappened, 2500)}
"""`;
}

/** Parse model output: body + trailing SOURCES: line with markdown links */
export function parseSemanticAssistantText(raw: string): {
  observation: string;
  sources: Array<{ title: string; url?: string }>;
} {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  let splitLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("↗") || /^SOURCES:\s*/i.test(line)) {
      splitLine = i;
      break;
    }
  }
  if (splitLine === -1) {
    return { observation: normalized, sources: [] };
  }

  const observation = lines
    .slice(0, splitLine)
    .join("\n")
    .trim()
    .replace(/\n[ \t]*\.[ \t]*$/g, "")
    .replace(/[ \t]+$/g, "")
    .trim();
  const sourceLines = lines.slice(splitLine);
  const sourcesPart = sourceLines.join("\n").replace(/^\s*SOURCES:\s*/i, "").trim();
  const sources: Array<{ title: string; url?: string }> = [];
  const linkRe = /\[([^\]]+)\]\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(sourcesPart)) !== null) {
    sources.push({ title: m[1].trim(), url: m[2]?.trim() || undefined });
  }
  if (sources.length === 0) {
    const arrowLines = sourcesPart
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("↗"))
      .map((line) => line.replace(/^↗\s*/, "").trim())
      .filter((line) => line && line.toLowerCase() !== "(none)");
    for (const title of arrowLines) {
      sources.push({ title });
    }
  }
  return { observation, sources };
}

export function sprintElapsedFraction(
  start?: string,
  end?: string
): number | undefined {
  if (!start || !end) return undefined;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  const now = Date.now();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return undefined;
  const t = (now - a) / (b - a);
  return Math.min(1, Math.max(0, t));
}
