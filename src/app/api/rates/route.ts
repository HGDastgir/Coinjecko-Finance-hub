import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  convertCurrency,
  isConverterCurrency,
} from "@/lib/markets/fx-rates";

/**
 * Server-side exchange-rate endpoint for the currency converter.
 *
 * Honesty contract, unchanged: this endpoint NEVER estimates or
 * fabricates a rate. It now answers with real ExchangeRate-API data
 * and carries that provider's own update timestamp so the UI can say
 * how old the rate is — the free feed refreshes once a day, so these
 * are daily reference rates, not dealing rates. If the upstream is
 * unavailable it answers 503 and the UI shows its disconnected state.
 *
 * Provider keys stay server-side; the browser only ever talks to this
 * route. Rate limiting is applied by the request proxy for /api paths.
 */

const querySchema = z.object({
  base: z.string().length(3).toUpperCase(),
  quote: z.string().length(3).toUpperCase(),
  amount: z.coerce.number().positive().max(1_000_000_000_000),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    base: request.nextUrl.searchParams.get("base"),
    quote: request.nextUrl.searchParams.get("quote"),
    amount: request.nextUrl.searchParams.get("amount"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { base, quote, amount } = parsed.data;
  if (!isConverterCurrency(base) || !isConverterCurrency(quote)) {
    return NextResponse.json({ error: "unsupported_currency" }, { status: 400 });
  }

  const conversion = await convertCurrency(base, quote, amount);
  if (!conversion) {
    return NextResponse.json(
      { error: "provider_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      base,
      quote,
      amount,
      rate: conversion.rate,
      result: conversion.result,
      asOf: conversion.updatedAt,
      source: conversion.source,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    },
  );
}
