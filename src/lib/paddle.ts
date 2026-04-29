import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddle: Paddle | undefined;

export async function getPaddle() {
  if (typeof window === "undefined") return undefined;
  if (!paddle) {
    paddle = await initializePaddle({
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    });
  }
  return paddle;
}
