import { NextResponse } from "next/server";
import { fetchCryptoTicker } from "@/lib/markets/crypto-ticker";

/**
 * Live crypto quotes for the ticker bar.
 *
 * The browser only ever talks to this route — CoinGecko is called
 * server-side, so no third-party origin enters the CSP and any API key
 * stays off the client. Rate limiting for /api paths is applied by the
 * request proxy.
 *
 * Same honesty contract as /api/rates: when the upstream call fails
 * this answers 503 rather than serving a stale or invented price, and
 * the ticker renders nothing.
 */

export const revalidate = 60;

export async function GET() {
  const data = await fetchCryptoTicker();

  if (!data) {
    return NextResponse.json(
      { error: "provider_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(data, {
    headers: {
      // Short shared cache; the upstream fetch is itself revalidated
      // every 60s, so one CoinGecko call serves every visitor.
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    },
  });
}
