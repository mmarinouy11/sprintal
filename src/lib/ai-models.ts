// HOW TO CHANGE MODELS WITHOUT REDEPLOY:
// 1. Vercel → Settings → Environment Variables
// 2. Update AI_MODEL_SEMANTIC, AI_MODEL_FORMULATION, or AI_MODEL_FALLBACK
// 3. No redeploy needed — API routes read process.env at runtime
// 4. Verify in Vercel Functions logs that the new model is being used

export const AI_MODELS = {
  formulation: process.env.AI_MODEL_FORMULATION ?? "claude-haiku-4-5-20251001",
  semantic: process.env.AI_MODEL_SEMANTIC ?? "claude-sonnet-4-5",
  semanticFallback: process.env.AI_MODEL_FALLBACK ?? "claude-haiku-4-5-20251001",
} as const;

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];
