"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import {
  deltaClass,
  formatChange,
  formatUsd,
  useCryptoMarkets,
  type CryptoQuoteView,
} from "@/components/markets/useCryptoMarkets";

/**
 * Scrolling live crypto prices above the header.
 *
 * Deliberately carries price and 24h change only — market cap and
 * volume live in the table on /crypto, where they have column headers
 * to explain them. A scrolling strip is the wrong place for a figure
 * nobody can pause to read.
 *
 * Renders nothing when the provider is unavailable: an empty strip is
 * honest, a frozen price is not.
 */
/**
 * The strip carries the largest coins only. It is a glance surface,
 * not the market table: pushing all 250 through it made the loop
 * unreadably fast, because the same animation had to traverse 35x the
 * content in the same time.
 */
const TICKER_COINS = 12;

/** Seconds per coin, so adding coins slows the strip instead of
 *  speeding it up. Tuned so a coin stays legible as it passes. */
const SECONDS_PER_COIN = 7;

export function CryptoTicker({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { ariaLabel: string; attribution: string };
}) {
  const data = useCryptoMarkets();

  if (!data || data.quotes.length === 0) return null;

  const quotes = data.quotes.slice(0, TICKER_COINS);
  const durationSeconds = quotes.length * SECONDS_PER_COIN;

  const row = (quote: CryptoQuoteView) => (
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
          <div
            className="ticker-track"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            <ul className="ticker-group">{quotes.map(row)}</ul>
            {/* Second copy makes the loop seamless; hidden from
                assistive tech so prices are not announced twice. */}
            <ul className="ticker-group" aria-hidden="true" data-copy="1">
              {quotes.map(row)}
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
