import { NextResponse } from "next/server";

export function apiError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function apiOk(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: init?.headers,
  });
}
