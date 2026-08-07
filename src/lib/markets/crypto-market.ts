import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { CRYPTO_ASSETS } from "@/lib/markets/asset-data";

/**
 * Live crypto market data from CoinGecko — price, 24h change, market
 * capitalisation and 24h trading volume for the coins this site
 * covers. Feeds both the ticker bar and the crypto market table.
 *
 * Fetched server-side only, per the rule in .env.example that all
 * third-party market data goes through our own routes: the browser
 * never talks to CoinGecko, so no third-party origin has to be added
 * to the CSP allow-list and any future API key stays server-side.
 *
 * Honest-data rule: these are real quotes from a named provider,
 * carried with the provider's own `last_updated` timestamp so the UI
 * can say where the number came from and how old it is.
 *
 * CACHING — this is load-bearing, not an optimisation. CoinGecko's
 * free tier allows roughly 10–30 calls a minute for the whole server,
 * while every visitor's ticker polls once a minute. Relying on Next's
 * fetch Data Cache alone was not enough: observed in dev, each request
 * still reached CoinGecko and the upstream started answering 429.
 * So the payload is cached in-process for REFRESH_MS and concurrent
 * callers share one in-flight request, which turns any amount of
 * traffic into at most one upstream call per minute per instance.
 *
 * When a refresh fails, the last good payload is served for a short
 * grace window rather than blanking the site — every figure carries
 * the provider's own quote timestamp, and the market table displays
 * it, so a reader can see the age. Past that window this returns null
 * and the UI shows its disconnected state; it will never invent or
 * indefinitely freeze a price.
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
const GLOBAL_ENDPOINT = "https://api.coingecko.com/api/v3/global";

const globalSchema = z.object({
  data: z.object({
    total_market_cap: z.object({ usd: z.number().finite().nonnegative() }),
    total_volume: z.object({ usd: z.number().finite().nonnegative() }),
    market_cap_percentage: z.record(z.string(), z.number().finite()),
    market_cap_change_percentage_24h_usd: z.number().finite().nullable(),
    active_cryptocurrencies: z.number().int().nonnegative().nullable(),
  }),
});

export interface GlobalCryptoStats {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  marketCapChange24hPct: number | null;
  btcDominancePct: number | null;
  ethDominancePct: number | null;
  activeCryptocurrencies: number | null;
  source: "CoinGecko";
  fetchedAt: string;
}

/** Upstream is untrusted input; only the fields we render are accepted. */
const marketRowSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number().finite().nonnegative(),
  price_change_percentage_24h: z.number().finite().nullable(),
  market_cap: z.number().finite().nonnegative().nullable(),
  total_volume: z.number().finite().nonnegative().nullable(),
  market_cap_rank: z.number().int().positive().nullable(),
  last_updated: z.string(),
});

const marketsSchema = z.array(marketRowSchema);

export interface CryptoQuote {
  /** Site slug, so callers can link to our own asset page. */
  slug: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number | null;
  /** Null when the provider omits it — rendered as "—", never as 0. */
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  marketCapRank: number | null;
  /** Provider's timestamp for this quote, not our fetch time. */
  quotedAt: string;
}

export interface CryptoMarketData {
  quotes: CryptoQuote[];
  source: "CoinGecko";
  sourceUrl: string;
  fetchedAt: string;
}

const SLUG_BY_COINGECKO_ID = new Map(
  Object.entries(COINGECKO_IDS).map(([slug, id]) => [id, slug]),
);

/** How long a payload counts as fresh. */
const REFRESH_MS = 60_000;
/** How long a stale payload may still be served after a failed refresh. */
const STALE_GRACE_MS = 120_000;
/** How long to leave CoinGecko alone after it rate-limits us. */
const COOLDOWN_MS = 60_000;

let cached: { data: CryptoMarketData; at: number } | null = null;
let inFlight: Promise<CryptoMarketData | null> | null = null;
let cooldownUntil = 0;

export async function fetchCryptoMarkets(): Promise<CryptoMarketData | null> {
  const now = Date.now();

  if (cached && now - cached.at < REFRESH_MS) return cached.data;

  // Being rate-limited and retrying immediately is what caused the
  // rate limiting. Ride it out on the last good payload.
  if (now < cooldownUntil) return servableStale(now);

  // Collapse a burst of concurrent callers into one upstream request.
  inFlight ??= requestMarkets().finally(() => {
    inFlight = null;
  });

  const fresh = await inFlight;
  if (fresh) {
    cached = { data: fresh, at: Date.now() };
    return fresh;
  }
  return servableStale(Date.now());
}

let cachedGlobal: { data: GlobalCryptoStats; at: number } | null = null;
let globalInFlight: Promise<GlobalCryptoStats | null> | null = null;

/**
 * Aggregate market stats. Same cache-and-share discipline as the coin
 * list — this is a second upstream endpoint, so without it the free
 * tier's budget is spent twice as fast.
 */
export async function fetchGlobalCryptoStats(): Promise<GlobalCryptoStats | null> {
  const now = Date.now();
  if (cachedGlobal && now - cachedGlobal.at < REFRESH_MS) return cachedGlobal.data;
  if (now < cooldownUntil) return servableStaleGlobal(now);

  globalInFlight ??= requestGlobal().finally(() => {
    globalInFlight = null;
  });

  const fresh = await globalInFlight;
  if (fresh) {
    cachedGlobal = { data: fresh, at: Date.now() };
    return fresh;
  }
  return servableStaleGlobal(Date.now());
}

async function requestGlobal(): Promise<GlobalCryptoStats | null> {
  const apiKey = serverEnv().CRYPTO_DATA_API_KEY;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  try {
    const response = await fetch(GLOBAL_ENDPOINT, {
      headers,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      logger.warn("crypto_global.upstream_error", { status: response.status });
      if (response.status === 429) cooldownUntil = Date.now() + COOLDOWN_MS;
      return null;
    }

    const parsed = globalSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.warn("crypto_global.unexpected_shape");
      return null;
    }

    const d = parsed.data.data;
    return {
      totalMarketCapUsd: d.total_market_cap.usd,
      totalVolume24hUsd: d.total_volume.usd,
      marketCapChange24hPct: d.market_cap_change_percentage_24h_usd,
      btcDominancePct: d.market_cap_percentage.btc ?? null,
      ethDominancePct: d.market_cap_percentage.eth ?? null,
      activeCryptocurrencies: d.active_cryptocurrencies,
      source: "CoinGecko",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("crypto_global.fetch_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

function servableStaleGlobal(now: number): GlobalCryptoStats | null {
  if (!cachedGlobal) return null;
  if (now - cachedGlobal.at > REFRESH_MS + STALE_GRACE_MS) return null;
  return cachedGlobal.data;
}

function servableStale(now: number): CryptoMarketData | null {
  if (!cached) return null;
  if (now - cached.at > REFRESH_MS + STALE_GRACE_MS) return null;
  return cached.data;
}

async function requestMarkets(): Promise<CryptoMarketData | null> {
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
      // Belt and braces behind the in-process cache above, which is
      // what actually guarantees one upstream call per minute.
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      logger.warn("crypto_market.upstream_error", { status: response.status });
      if (response.status === 429) cooldownUntil = Date.now() + COOLDOWN_MS;
      return null;
    }

    const parsed = marketsSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.warn("crypto_market.unexpected_shape");
      return null;
    }

    const quotes: CryptoQuote[] = parsed.data.flatMap((row) => {
      const slug = SLUG_BY_COINGECKO_ID.get(row.id);
      if (!slug) return [];
      return [
        {
          slug,
          symbol: row.symbol.toUpperCase(),
          name: row.name,
          priceUsd: row.current_price,
          change24hPct: row.price_change_percentage_24h,
          marketCapUsd: row.market_cap,
          volume24hUsd: row.total_volume,
          marketCapRank: row.market_cap_rank,
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
    logger.warn("crypto_market.fetch_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}
