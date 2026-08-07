import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Exchange rates from ExchangeRate-API's open endpoint.
 *
 * HONESTY NOTE, and it drives the UI copy: the free open feed updates
 * ONCE PER DAY. These are daily reference rates, not live dealing
 * rates, and they are not what a bank or exchange will give you. The
 * provider's own `time_last_update_utc` is carried through and shown,
 * and the UI must not call them "live". Wiring a paid tier later
 * changes only the endpoint and the copy.
 *
 * Fetched server-side per the .env.example rule that third-party
 * market data goes through our own routes, so no third-party origin
 * enters the CSP and a future key stays off the client. Cached and
 * in-flight-shared like the crypto feed — a daily feed polled per
 * visitor would be pure waste.
 */

const OPEN_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

const responseSchema = z.object({
  result: z.literal("success"),
  base_code: z.string(),
  time_last_update_utc: z.string(),
  time_next_update_utc: z.string(),
  rates: z.record(z.string(), z.number().finite().positive()),
});

export interface FxRates {
  /** Every rate expressed per 1 USD. */
  perUsd: Record<string, number>;
  updatedAt: string;
  nextUpdateAt: string;
  source: "ExchangeRate-API";
  sourceUrl: string;
}

/**
 * Currencies offered in the converter. Deliberately a curated
 * allow-list rather than "whatever the provider returned": it keeps
 * the corridors this audience actually uses at the top of the list
 * and stops an upstream change silently adding hundreds of options.
 */
export const CONVERTER_CURRENCIES = [
  "USD",
  "PKR",
  "AED",
  "SAR",
  "GBP",
  "EUR",
  "CAD",
  "INR",
  "AUD",
  "QAR",
  "KWD",
  "OMR",
  "BHD",
  "TRY",
  "CNY",
  "JPY",
  "MYR",
  "SGD",
  "CHF",
  "ZAR",
] as const;

export type ConverterCurrency = (typeof CONVERTER_CURRENCIES)[number];

export function isConverterCurrency(
  value: unknown,
): value is ConverterCurrency {
  return (
    typeof value === "string" &&
    (CONVERTER_CURRENCIES as readonly string[]).includes(value)
  );
}

/** The feed moves once a day; an hour of cache is still conservative. */
const REFRESH_MS = 60 * 60 * 1000;
const STALE_GRACE_MS = 6 * 60 * 60 * 1000;

let cached: { data: FxRates; at: number } | null = null;
let inFlight: Promise<FxRates | null> | null = null;

export async function fetchFxRates(): Promise<FxRates | null> {
  const now = Date.now();
  if (cached && now - cached.at < REFRESH_MS) return cached.data;

  inFlight ??= requestRates().finally(() => {
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

async function requestRates(): Promise<FxRates | null> {
  // A paid ExchangeRate-API key swaps in a keyed endpoint later; the
  // open feed needs none, so this stays optional.
  const apiKey = serverEnv().FOREX_DATA_API_KEY;
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    : OPEN_ENDPOINT;

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      logger.warn("fx_rates.upstream_error", { status: response.status });
      return null;
    }

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.warn("fx_rates.unexpected_shape");
      return null;
    }

    return {
      perUsd: parsed.data.rates,
      updatedAt: parsed.data.time_last_update_utc,
      nextUpdateAt: parsed.data.time_next_update_utc,
      source: "ExchangeRate-API",
      sourceUrl: "https://www.exchangerate-api.com",
    };
  } catch (err) {
    logger.warn("fx_rates.fetch_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

export interface Conversion {
  rate: number;
  result: number;
  updatedAt: string;
  source: string;
}

/**
 * Cross-rate via USD. Returns null when either leg is missing rather
 * than falling back to 1 or an approximation.
 */
export async function convertCurrency(
  base: string,
  quote: string,
  amount: number,
): Promise<Conversion | null> {
  const rates = await fetchFxRates();
  if (!rates) return null;

  const basePerUsd = rates.perUsd[base];
  const quotePerUsd = rates.perUsd[quote];
  if (!basePerUsd || !quotePerUsd) {
    logger.warn("fx_rates.missing_pair", { base, quote });
    return null;
  }

  const rate = quotePerUsd / basePerUsd;
  return {
    rate,
    result: amount * rate,
    updatedAt: rates.updatedAt,
    source: rates.source,
  };
}
