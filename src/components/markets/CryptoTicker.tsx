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
export function CryptoTicker({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { ariaLabel: string; attribution: string };
}) {
  const data = useCryptoMarkets();

  if (!data || data.quotes.length === 0) return null;

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
