"use client";

import { useEffect, useState } from "react";

/**
 * Polls /api/crypto-markets, which proxies CoinGecko server-side.
 *
 * Returns null until the first successful response, and back to null
 * whenever the route answers anything but 200. Callers must render
 * their disconnected state on null rather than holding the last good
 * value — a price that has quietly stopped updating is worse than no
 * price at all.
 */

export interface CryptoQuoteView {
  slug: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  marketCapRank: number | null;
  quotedAt: string;
}

export interface GlobalStatsView {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  marketCapChange24hPct: number | null;
  btcDominancePct: number | null;
  ethDominancePct: number | null;
  activeCryptocurrencies: number | null;
}

export interface CryptoMarketPayload {
  quotes: CryptoQuoteView[];
  /** Null when the aggregate endpoint failed but the coin list did not. */
  global: GlobalStatsView | null;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
}

export const CRYPTO_REFRESH_MS = 60_000;

export function useCryptoMarkets(
  refreshMs: number = CRYPTO_REFRESH_MS,
): CryptoMarketPayload | null {
  const [data, setData] = useState<CryptoMarketPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/crypto-markets", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const payload = (await response.json()) as CryptoMarketPayload;
        if (!cancelled) setData(payload);
      } catch {
        // Offline or blocked — drop to the disconnected state.
        if (!cancelled) setData(null);
      }
    }

    void load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshMs]);

  return data;
}

/** Shared USD formatting so the ticker and table agree. */
export function formatUsd(value: number): string {
  const digits = value >= 1000 ? 0 : value >= 1 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Compact USD for the large figures: $1.31T, $19.1B. */
export function formatCompactUsd(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChange(pct: number): string {
  if (pct === 0) return "0.00%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`;
}

/**
 * Flat is its own state. Rendering an unchanged price as "▲ +0.00%"
 * would claim a rise that did not happen.
 */
export function deltaClass(pct: number): string {
  if (pct > 0) return "delta-up";
  if (pct < 0) return "delta-down";
  return "text-ink-muted";
}
