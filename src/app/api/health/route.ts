import { NextResponse } from "next/server";

/**
 * Liveness probe for uptime monitoring. Intentionally reveals no
 * version, dependency or infrastructure detail.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
