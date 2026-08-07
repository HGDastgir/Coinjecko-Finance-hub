import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { CRYPTO_ASSETS } from "@/lib/markets/asset-data";

/**
 * Live crypto quotes from CoinGecko for the ticker bar.
 *
 * Fetched server-side only, per the rule in .env.example that all
 * third-party market data goes through our own routes: the browser
 * never talks to CoinGecko, so no third-party origin has to be added
 * to the CSP allow-list and any future API key stays server-side.
 *
 * Honest-data rule: these are real quotes from a named provider,
 * carried with the provider's own `last_updated` timestamp so the UI
 * can say where the number came from and how old it is. On any
 * failure this returns null — the ticker then renders nothing rather
 * than showing a stale or invented price.
 */

/** Site slug → CoinGecko id. They differ for XRP and BNB. */
const COINGECKO_IDS: Record<string, string> = {
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  tether: "tether",
  xrp: "ripple",
  bnb: "binancecoin",
  solana: "solana",
  cardano: "cardano",
};

const ENDPOINT = "https://api.coingecko.com/api/v3/coins/markets";

/** Upstream is untrusted input; only the fields we render are accepted. */
const marketRowSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number().finite().nonnegative(),
  price_change_percentage_24h: z.number().finite().nullable(),
  last_updated: z.string(),
});

const marketsSchema = z.array(marketRowSchema);

export interface TickerQuote {
  /** Site slug, so the ticker can link to our own asset page. */
  slug: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number | null;
  /** Provider's timestamp for this quote, not our fetch time. */
  quotedAt: string;
}

export interface CryptoTickerData {
  quotes: TickerQuote[];
  source: "CoinGecko";
  sourceUrl: string;
  fetchedAt: string;
}

const SLUG_BY_COINGECKO_ID = new Map(
  Object.entries(COINGECKO_IDS).map(([slug, id]) => [id, slug]),
);

export async function fetchCryptoTicker(): Promise<CryptoTickerData | null> {
  const ids = CRYPTO_ASSETS.map((asset) => COINGECKO_IDS[asset.slug]).filter(
    Boolean,
  );
  if (ids.length === 0) return null;

  const url = `${ENDPOINT}?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&price_change_percentage=24h`;

  // The free tier needs no key; a demo key raises the rate limit when
  // one is configured. Never exposed to the browser.
  const apiKey = serverEnv().CRYPTO_DATA_API_KEY;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
      // Shared cache across visitors; CoinGecko's free tier is rate
      // limited per IP, so one upstream call serves everyone.
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      logger.warn("crypto_ticker.upstream_error", { status: response.status });
      return null;
    }

    const parsed = marketsSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.warn("crypto_ticker.unexpected_shape");
      return null;
    }

    const quotes: TickerQuote[] = parsed.data.flatMap((row) => {
      const slug = SLUG_BY_COINGECKO_ID.get(row.id);
      if (!slug) return [];
      return [
        {
          slug,
          symbol: row.symbol.toUpperCase(),
          name: row.name,
          priceUsd: row.current_price,
          change24hPct: row.price_change_percentage_24h,
          quotedAt: row.last_updated,
        },
      ];
    });

    if (quotes.length === 0) return null;

    return {
      quotes,
      source: "CoinGecko",
      sourceUrl: "https://www.coingecko.com",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("crypto_ticker.fetch_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}
