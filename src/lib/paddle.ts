import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import type { Environments } from "@paddle/paddle-js";

let paddle: Paddle | undefined;

/**
 * Paddle environment must match the client token and price IDs (sandbox vs live).
 * Do not infer from NODE_ENV alone: production builds often still use sandbox keys during rollout.
 *
 * Override explicitly with NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox | production
 */
export function getPaddleJsEnvironment(): Environments {
  const explicit = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
  if (explicit === "sandbox" || explicit === "production") return explicit;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
  if (token.startsWith("test_")) return "sandbox";
  if (token.startsWith("live_")) return "production";

  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}

export async function getPaddle() {
  if (typeof window === "undefined") return undefined;
  if (!paddle) {
    paddle = await initializePaddle({
      environment: getPaddleJsEnvironment(),
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    });
  }
  return paddle;
}
