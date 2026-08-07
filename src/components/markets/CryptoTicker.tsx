"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";

/**
 * Scrolling live crypto prices.
 *
 * Talks only to our own /api/crypto-ticker, which proxies CoinGecko
 * server-side. If that route answers anything but 200 the bar renders
 * nothing at all: an empty strip is honest, a frozen price is not.
 *
 * Movement follows the project rule — never colour alone. The
 * .delta-up / .delta-down classes prepend ▲ / ▼ and the sign stays in
 * the text, so the direction survives without colour vision.
 */

interface TickerQuote {
  slug: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number | null;
  quotedAt: string;
}

interface TickerPayload {
  quotes: TickerQuote[];
  source: string;
  sourceUrl: string;
  fetchedAt: string;
}

const REFRESH_MS = 60_000;

function formatUsd(value: number): string {
  const digits = value >= 1000 ? 0 : value >= 1 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatChange(pct: number): string {
  if (pct === 0) return "0.00%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`;
}

/**
 * Flat is its own state. Rendering an unchanged price as "▲ +0.00%"
 * would claim a rise that did not happen.
 */
function deltaClass(pct: number): string {
  if (pct > 0) return "delta-up";
  if (pct < 0) return "delta-down";
  return "text-ink-muted";
}

export function CryptoTicker({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { ariaLabel: string; attribution: string };
}) {
  const [data, setData] = useState<TickerPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/crypto-ticker", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const payload = (await response.json()) as TickerPayload;
        if (!cancelled) setData(payload);
      } catch {
        // Offline or blocked — show nothing rather than a stale price.
        if (!cancelled) setData(null);
      }
    }

    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!data || data.quotes.length === 0) return null;

  const row = (quote: TickerQuote) => (
    <li key={quote.slug} className="shrink-0">
      <Link
        href={`/${locale}/crypto/${quote.slug}`}
        className="flex items-baseline gap-2 px-4 py-1.5 text-sm hover:underline"
      >
        <span className="font-latin font-semibold">{quote.symbol}</span>
        <span className="font-latin tabular-nums">
          {formatUsd(quote.priceUsd)}
        </span>
        {quote.change24hPct === null ? null : (
          <span
            className={`font-latin tabular-nums ${deltaClass(quote.change24hPct)}`}
          >
            {formatChange(quote.change24hPct)}
          </span>
        )}
      </Link>
    </li>
  );

  return (
    <div className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4">
        <div className="ticker flex-1" aria-label={labels.ariaLabel}>
          <div className="ticker-track">
            <ul className="ticker-group">{data.quotes.map(row)}</ul>
            {/* Second copy makes the loop seamless; hidden from
                assistive tech so prices are not announced twice. */}
            <ul className="ticker-group" aria-hidden="true" data-copy="1">
              {data.quotes.map(row)}
            </ul>
          </div>
        </div>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 whitespace-nowrap text-xs text-ink-muted hover:text-ink"
        >
          {labels.attribution}
        </a>
      </div>
    </div>
  );
}
