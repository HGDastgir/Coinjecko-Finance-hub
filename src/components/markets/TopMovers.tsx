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
 * Biggest 24h risers and fallers across the coins we cover.
 *
 * Derived from the same payload the rest of the dashboard uses, so it
 * can never disagree with the market table. Coins whose change the
 * provider omits are excluded rather than treated as zero — an
 * unknown move is not a flat move.
 */

export interface MoversLabels {
  moversTitle: string;
  gainers: string;
  losers: string;
  noMovers: string;
}

function MoverRow({
  quote,
  locale,
}: {
  quote: CryptoQuoteView;
  locale: Locale;
}) {
  return (
    <li>
      <Link
        href={`/${locale}/crypto/${quote.slug}`}
        className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-surface-raised"
      >
        <span className="font-latin text-sm font-semibold">{quote.symbol}</span>
        <span className="flex items-baseline gap-3">
          <span className="font-latin text-sm tabular-nums text-ink-muted">
            {formatUsd(quote.priceUsd)}
          </span>
          <span
            className={`font-latin text-sm tabular-nums ${deltaClass(quote.change24hPct ?? 0)}`}
          >
            {formatChange(quote.change24hPct ?? 0)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function TopMovers({
  locale,
  labels,
}: {
  locale: Locale;
  labels: MoversLabels;
}) {
  const data = useCryptoMarkets();

  const rated = (data?.quotes ?? []).filter(
    (q): q is CryptoQuoteView & { change24hPct: number } =>
      q.change24hPct !== null,
  );

  if (rated.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-ink-muted shadow-card">
        {labels.noMovers}
      </div>
    );
  }

  const sorted = [...rated].sort((a, b) => b.change24hPct - a.change24hPct);
  const gainers = sorted.filter((q) => q.change24hPct > 0).slice(0, 4);
  const losers = sorted
    .filter((q) => q.change24hPct < 0)
    .slice(-4)
    .reverse();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[
        { title: labels.gainers, rows: gainers },
        { title: labels.losers, rows: losers },
      ].map(({ title, rows }) => (
        <div
          key={title}
          className="rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {title}
          </h3>
          {rows.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">—</p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {rows.map((quote) => (
                <MoverRow key={quote.slug} quote={quote} locale={locale} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
