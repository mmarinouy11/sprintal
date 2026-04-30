import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import type { Environments } from "@paddle/paddle-js";

let paddle: Paddle | undefined;

function redactTokenPrefix(token: string): string {
  if (!token) return "(empty)";
  const prefix = token.slice(0, 12);
  return `${prefix}… (len ${token.length})`;
}

function paddleEventCallback(event: PaddleEventData) {
  const name = (event.name ?? event.type ?? "unknown") as string;
  const verbose = process.env.NEXT_PUBLIC_PADDLE_DEBUG === "1";
  const isError =
    name === "checkout.error" ||
    name === "checkout.failed" ||
    name === "checkout.payment.error" ||
    name === "checkout.payment.failed";
  if (isError || verbose) {
    // eslint-disable-next-line no-console -- intentional diagnostics for Paddle checkout
    console.warn("[Paddle event]", name, {
      code: "code" in event ? event.code : undefined,
      detail: "detail" in event ? event.detail : undefined,
      documentation_url: "documentation_url" in event ? event.documentation_url : undefined,
      data: event.data,
      raw: event,
    });
  }
}

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
    const environment = getPaddleJsEnvironment();
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
    // eslint-disable-next-line no-console -- intentional diagnostics
    console.info("[Paddle] initializePaddle", {
      environment,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "(unset)",
      clientTokenPrefix: redactTokenPrefix(token),
    });
    paddle = await initializePaddle({
      environment,
      token,
      eventCallback: paddleEventCallback,
    });
  }
  return paddle;
}
