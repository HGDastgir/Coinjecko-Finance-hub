import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { lastCsvQuote } from "@/lib/markets/csv-quote";

/**
 * Live commodity benchmarks.
 *
 * Two providers, because no single free source covers both:
 *
 * - METALS (gold, silver) come from gold-api.com, which quotes spot in
 *   USD per troy ounce and carries its own `updatedAt`. Keyless.
 * - OIL (Brent, WTI) comes from the U.S. Energy Information
 *   Administration, which requires a free API key. Without
 *   COMMODITY_DATA_API_KEY the oil benchmarks stay gated rather than
 *   being filled from somewhere unlicensed — the honest-data rule
 *   applies to where a number came from, not just whether it exists.
 *
 * Per the .env.example rule, every upstream call is server-side: the
 * browser never talks to these hosts, so no third-party origin enters
 * the CSP and the EIA key stays off the client.
 *
 * Quotes are returned PER ASSET, and a missing one is null rather than
 * an omission — the UI shows a real price where there is one and its
 * disconnected state where there is not, on the same page. A partly
 * connected board is the truth here, so it is what gets rendered.
 *
 * Caching mirrors crypto-market.ts and is load-bearing, not an
 * optimisation: free tiers are rate-limited, and every visitor hitting
 * an ISR regeneration would exhaust them. One upstream call per
 * REFRESH_MS per instance, concurrent callers share the in-flight
 * promise, and a failed refresh serves the last good payload for a
 * grace window before going dark. It will never invent a price or
 * freeze one indefinitely.
 */

export interface CommodityQuote {
  /** Price in USD per the asset's own unit. */
  price: number;
  /** Provider's own quote timestamp, ISO 8601. */
  quotedAt: string;
  provider: string;
  providerUrl: string;
  /**
   * True when the figure is a daily/periodic reference rather than a
   * live spot tick. The UI must not call these "live".
   */
  isReference: boolean;
}

/** Keyed by the commodity slug in asset-data.ts. */
export type CommodityQuotes = Record<string, CommodityQuote | null>;

const METALS_ENDPOINT = "https://api.gold-api.com/price";
const METALS_PROVIDER = "gold-api.com";
const METALS_PROVIDER_URL = "https://gold-api.com";

/** Commodity slug → the provider's symbol. */
const METAL_SYMBOLS: Record<string, string> = {
  gold: "XAU",
  silver: "XAG",
};

const metalSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  price: z.number().finite().positive(),
  updatedAt: z.string(),
});

const EIA_ENDPOINT =
  "https://api.eia.gov/v2/petroleum/pri/spt/data/" +
  "?frequency=daily&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=2";
const EIA_PROVIDER = "U.S. Energy Information Administration";
const EIA_PROVIDER_URL = "https://www.eia.gov";

/** Commodity slug → EIA series id for the spot benchmark. */
const OIL_SERIES: Record<string, string> = {
  "brent-oil": "RBRTE",
  "wti-oil": "RWTC",
};

const eiaSchema = z.object({
  response: z.object({
    data: z.array(
      z.object({
        period: z.string(),
        series: z.string(),
        value: z.union([z.number(), z.string()]).nullable(),
      }),
    ),
  }),
});

/**
 * Keyless fallback for the oil benchmarks.
 *
 * The EIA's own API needs a free key, which not every deployment will
 * have. Rather than gating the two oil cards behind that, this reads
 * the same EIA spot series republished as a public-domain dataset
 * (ODC-PDDL) on datahub.io — real figures from the same primary
 * source, no registration.
 *
 * The trade-off is freshness: the republished file typically trails
 * the EIA by several business days. That is acceptable ONLY because
 * every quote carries its own date through to the UI, which prints it
 * next to the price. A stale number shown as current would break the
 * honest-data rule; a stale number shown WITH its date is just an
 * older reading, and the reader can see that.
 *
 * With COMMODITY_DATA_API_KEY set, the EIA API is used instead and
 * this is never reached.
 */
const DATAHUB_BASE =
  "https://raw.githubusercontent.com/datasets/oil-prices/main/data";

const DATAHUB_FILES: Record<string, string> = {
  "brent-oil": "brent-daily.csv",
  "wti-oil": "wti-daily.csv",
};

const DATAHUB_PROVIDER = "U.S. EIA via datahub.io";
const DATAHUB_PROVIDER_URL = "https://datahub.io/core/oil-prices";

const REFRESH_MS = 60 * 1000;
const STALE_GRACE_MS = 15 * 60 * 1000;

let cached: { data: CommodityQuotes; at: number } | null = null;
let inFlight: Promise<CommodityQuotes | null> | null = null;

export async function fetchCommodityQuotes(): Promise<CommodityQuotes | null> {
  const now = Date.now();
  if (cached && now - cached.at < REFRESH_MS) return cached.data;

  inFlight ??= requestQuotes().finally(() => {
    inFlight = null;
  });

  const fresh = await inFlight;
  if (fresh) {
    cached = { data: fresh, at: Date.now() };
    return fresh;
  }
  if (!cached) return null;
  return now - cached.at > REFRESH_MS + STALE_GRACE_MS ? null : cached.data;
}

async function requestQuotes(): Promise<CommodityQuotes | null> {
  const [metals, oil] = await Promise.all([fetchMetals(), fetchOil()]);

  // Null only when NOTHING resolved: that is a real outage. A partial
  // board is a legitimate result and must not blank the working half.
  const quotes: CommodityQuotes = { ...metals, ...oil };
  const anyLive = Object.values(quotes).some((q) => q !== null);
  return anyLive ? quotes : null;
}

async function fetchMetals(): Promise<CommodityQuotes> {
  const entries = await Promise.all(
    Object.entries(METAL_SYMBOLS).map(async ([slug, symbol]) => {
      try {
        const response = await fetch(`${METALS_ENDPOINT}/${symbol}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 60 },
        });
        if (!response.ok) {
          logger.warn("commodity.metals_upstream_error", {
            symbol,
            status: response.status,
          });
          return [slug, null] as const;
        }

        const parsed = metalSchema.safeParse(await response.json());
        if (!parsed.success) {
          logger.warn("commodity.metals_unexpected_shape", { symbol });
          return [slug, null] as const;
        }

        return [
          slug,
          {
            price: parsed.data.price,
            quotedAt: parsed.data.updatedAt,
            provider: METALS_PROVIDER,
            providerUrl: METALS_PROVIDER_URL,
            isReference: false,
          },
        ] as const;
      } catch (err) {
        logger.warn("commodity.metals_fetch_failed", {
          symbol,
          reason: err instanceof Error ? err.message : "unknown",
        });
        return [slug, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

async function fetchOil(): Promise<CommodityQuotes> {
  const apiKey = serverEnv().COMMODITY_DATA_API_KEY;
  // No key is no longer a dead end: fall back to the same EIA series
  // republished as public-domain data. Slightly older, fully dated.
  if (!apiKey) return fetchOilFromDatahub();

  const entries = await Promise.all(
    Object.entries(OIL_SERIES).map(async ([slug, series]) => {
      try {
        const url = `${EIA_ENDPOINT}&facets[series][]=${series}&api_key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 3600 },
        });
        if (!response.ok) {
          logger.warn("commodity.oil_upstream_error", {
            series,
            status: response.status,
          });
          return [slug, null] as const;
        }

        const parsed = eiaSchema.safeParse(await response.json());
        if (!parsed.success) {
          logger.warn("commodity.oil_unexpected_shape", { series });
          return [slug, null] as const;
        }

        const row = parsed.data.response.data.find((r) => r.value !== null);
        if (!row || row.value === null) return [slug, null] as const;

        const price =
          typeof row.value === "number" ? row.value : Number(row.value);
        if (!Number.isFinite(price) || price <= 0) {
          return [slug, null] as const;
        }

        return [
          slug,
          {
            price,
            // EIA periods are dates ("2026-08-07"), not instants.
            quotedAt: `${row.period}T00:00:00Z`,
            provider: EIA_PROVIDER,
            providerUrl: EIA_PROVIDER_URL,
            // Official daily spot, published with a lag — not a tick.
            isReference: true,
          },
        ] as const;
      } catch (err) {
        logger.warn("commodity.oil_fetch_failed", {
          series,
          reason: err instanceof Error ? err.message : "unknown",
        });
        return [slug, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

/**
 * The keyless oil path. Each benchmark is fetched independently so one
 * failing file cannot take the other down with it.
 */
async function fetchOilFromDatahub(): Promise<CommodityQuotes> {
  const entries = await Promise.all(
    Object.entries(DATAHUB_FILES).map(async ([slug, file]) => {
      try {
        const response = await fetch(`${DATAHUB_BASE}/${file}`, {
          headers: { accept: "text/csv" },
          signal: AbortSignal.timeout(8000),
          // The file changes at most daily; an hour is generous.
          next: { revalidate: 3600 },
        });

        if (!response.ok) {
          logger.warn("commodity.oil_fallback_error", {
            file,
            status: response.status,
          });
          return [slug, null] as const;
        }

        const quote = lastCsvQuote(await response.text());
        if (!quote) {
          logger.warn("commodity.oil_fallback_unparsed", { file });
          return [slug, null] as const;
        }

        return [
          slug,
          {
            price: quote.price,
            quotedAt: `${quote.date}T00:00:00Z`,
            provider: DATAHUB_PROVIDER,
            providerUrl: DATAHUB_PROVIDER_URL,
            // A settled daily close, republished — never a live tick.
            isReference: true,
          },
        ] as const;
      } catch (err) {
        logger.warn("commodity.oil_fallback_failed", {
          file,
          reason: err instanceof Error ? err.message : "unknown",
        });
        return [slug, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

/** USD formatting that keeps sub-dollar metals readable. */
export function formatCommodityPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 10 ? 4 : 2,
  }).format(price);
}
