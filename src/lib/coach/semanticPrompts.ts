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


export function SEMANTIC_BET_USER_PROMPT(
  localeLabel: string,
  ctx: SemanticBetContext
): string {
  const sprintJson = ctx.sprint ? JSON.stringify(ctx.sprint, null, 2) : "null";
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

Bet (JSON):
${JSON.stringify(ctx.bet, null, 2)}

Active sprint context (JSON):
${sprintJson}

Other bets in this sprint (for duplication / alignment): ${siblings}

Approximate sprint time elapsed (if inferred from dates): ${elapsed}

Use web_search when it helps find market trends, benchmarks, or research relevant to this bet's outcome and sector (inferred from org + bet text only).

Deliver one integrated observation (max 4 sentences), then the SOURCES line as specified in the system message.`;
}

export function SEMANTIC_PORTFOLIO_USER_PROMPT(
  localeLabel: string,
  ctx: SemanticPortfolioContext
): string {
  const sprintJson = ctx.sprint ? JSON.stringify(ctx.sprint, null, 2) : "null";
  return `Language: ${localeLabel}

Organization: ${ctx.orgName}

Active sprint (JSON):
${sprintJson}

Active bets in portfolio (JSON array):
${JSON.stringify(ctx.bets, null, 2)}

Analyze portfolio balance (revenue / margin / capability mix, risk distribution), coherence with sprint strategic focus, and duplication across bets.
Use web_search for sector-level trends only when it strengthens the observation.

One integrated observation (max 4 sentences), then SOURCES line.`;
}

export function SEMANTIC_REVIEW_USER_PROMPT(
  localeLabel: string,
  ctx: SemanticReviewContext
): string {
  const base = SEMANTIC_BET_USER_PROMPT(localeLabel, ctx);
  return `${base}

Strategic review — "What happened" (evidence the user entered):
"""
${ctx.reviewWhatHappened}
"""

Weight this evidence heavily; relate it to hypothesis, kill/scale criteria, and signal. Then web_search only if it sharpens external context for this outcome.`;
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
