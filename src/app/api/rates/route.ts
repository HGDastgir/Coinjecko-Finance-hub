import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { converterCurrencies } from "@/lib/markets/asset-data";

/**
 * Server-side exchange-rate endpoint for the currency converter.
 *
 * Honesty contract: this endpoint NEVER estimates or fabricates a
 * rate. Until a licensed forex data provider is configured
 * (FOREX_DATA_API_KEY) and integrated, it answers 503 and the UI
 * shows the "rates not connected" state. Provider keys stay
 * server-side; the browser only ever talks to this route.
 * Rate limiting is applied by the request proxy for all /api paths.
 */

const querySchema = z.object({
  base: z.string().length(3).toUpperCase(),
  quote: z.string().length(3).toUpperCase(),
  amount: z.coerce.number().positive().max(1_000_000_000_000),
});

export function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    base: request.nextUrl.searchParams.get("base"),
    quote: request.nextUrl.searchParams.get("quote"),
    amount: request.nextUrl.searchParams.get("amount"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const allowed = new Set(converterCurrencies());
  const { base, quote } = parsed.data;
  if (!allowed.has(base) || !allowed.has(quote)) {
    return NextResponse.json({ error: "unsupported_currency" }, { status: 400 });
  }

  if (!serverEnv().FOREX_DATA_API_KEY) {
    return NextResponse.json(
      { error: "provider_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Provider integration lands with the licensed data phase; until the
  // upstream call exists we still refuse to invent a rate.
  return NextResponse.json(
    { error: "provider_not_configured" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
