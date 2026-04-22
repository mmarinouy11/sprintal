import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FIELD_PROMPTS, SPRINT_DURATION_CONTEXT } from "@/lib/coach/prompts";
import type { CoachField } from "@/lib/coach/useSyntacticCoach";

export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { field, value, sprintDays } = await req.json() as {
      field: CoachField;
      value: string;
      sprintDays?: number;
    };

    if (!field || !value || !FIELD_PROMPTS[field]) {
      return NextResponse.json({ observation: null });
    }

    const systemPrompt = sprintDays
      ? `${FIELD_PROMPTS[field]}\n\n${SPRINT_DURATION_CONTEXT(sprintDays)}`
      : FIELD_PROMPTS[field];

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
    console.log("Coach API response:", JSON.stringify(data).slice(0, 200));
    const text = data.content?.[0]?.text?.trim() || "";
    console.log("Coach text:", text);
    const observation = text === "NULL" || text === "" ? null : text;

    return NextResponse.json({ observation });
  } catch (e) {
    console.error("Coach error:", e);
    return NextResponse.json({ observation: null });
  }
}
