import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import type { Environments } from "@paddle/paddle-js";

let paddle: Paddle | undefined;

function redactTokenPrefix(token: string): string {
  if (!token) return "(empty)";
  const prefix = token.slice(0, 12);
  return `${prefix}… (len ${token.length})`;
}

/**
 * Paddle.js must be initialized with a **client-side token** (`test_…` / `live_…`).
 * If `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set to `PADDLE_API_KEY` (`pdl_…apikey…`),
 * checkout calls return 403 and the browser may show a misleading CORS error.
 */
export function getPaddleClientTokenMisconfigurationMessage(token: string): string | null {
  if (!token.trim()) {
    return "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is empty. Set it to your Paddle client-side token (starts with test_ or live_).";
  }
  if (token.startsWith("test_") || token.startsWith("live_")) return null;
  if (token.startsWith("pdl_") || token.toLowerCase().includes("apikey")) {
    return (
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is a server API key (pdl_…). " +
      "Use the client-side token from Paddle (Dashboard → Developer tools → Authentication, or checkout client token). " +
      "It must start with test_ (sandbox) or live_ (production). " +
      "Keep PADDLE_API_KEY only on the server — never in NEXT_PUBLIC_*."
    );
  }
  return (
    "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN does not look like a client-side token (expected test_… or live_…). " +
    "Regenerate/copy the client token from Paddle, not the API key."
  );
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
    if (
      name === "checkout.error" &&
      "detail" in event &&
      event.detail === "transaction_default_checkout_url_not_set"
    ) {
      // eslint-disable-next-line no-console -- intentional diagnostics
      console.error(
        "[Paddle] Set Default payment link in seller dashboard (required for checkout). " +
          "Sandbox: https://sandbox-vendors.paddle.com/checkout-settings — " +
          "Live: https://vendors.paddle.com/checkout-settings — " +
          "Docs: https://developer.paddle.com/errors/transactions/transaction_default_checkout_url_not_set"
      );
    }
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
    const misconfigured = getPaddleClientTokenMisconfigurationMessage(token);
    if (misconfigured) {
      // eslint-disable-next-line no-console -- intentional diagnostics
      console.error("[Paddle] misconfigured client token:", misconfigured);
      return undefined;
    }
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
