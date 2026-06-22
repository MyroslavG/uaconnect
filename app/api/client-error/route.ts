import { NextResponse } from "next/server";

import { logServerError } from "@/lib/diagnostics";

const maxFieldLength = 1000;

export async function POST(request: Request) {
  const body = await readPayload(request);

  logServerError(
    "client.exception",
    new Error(normalizeField(body.message) || "Client-side exception"),
    {
      componentStack: normalizeField(body.componentStack),
      digest: normalizeField(body.digest),
      path: normalizeField(body.path),
      source: normalizeField(body.source),
      stack: normalizeField(body.stack),
      userAgent: normalizeField(request.headers.get("user-agent")),
    },
  );

  return NextResponse.json({ ok: true });
}

async function readPayload(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return payload;
  } catch {
    return {};
  }
}

function normalizeField(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.length > maxFieldLength
    ? `${value.slice(0, maxFieldLength)}...`
    : value;
}
