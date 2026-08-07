"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import {
  deltaClass,
  formatChange,
  formatCompactUsd,
  formatUsd,
  useCryptoMarkets,
} from "@/components/markets/useCryptoMarkets";

/**
 * Live crypto market table: price, 24h change, market capitalisation
 * and 24h trading volume.
 *
 * Wide content scrolls inside its own container so the page body never
 * scrolls sideways on a phone. Figures are tabular-nums and marked
 * font-latin so Latin digits keep their shape inside Urdu text.
 */

export interface MarketTableLabels {
  heading: string;
  asset: string;
  price: string;
  change24h: string;
  marketCap: string;
  volume24h: string;
  unavailable: string;
  quotedAt: string;
  attribution: string;
}

export function CryptoMarketTable({
  locale,
  labels,
}: {
  locale: Locale;
  labels: MarketTableLabels;
}) {
  const data = useCryptoMarkets();

  if (!data || data.quotes.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
        {labels.unavailable}
      </div>
    );
  }

  const ranked = [...data.quotes].sort(
    (a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0),
  );
  const quotedAt = ranked[0]?.quotedAt;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[34rem] border-collapse bg-surface text-sm">
          <caption className="sr-only">{labels.heading}</caption>
          <thead>
            <tr className="border-b border-border text-start text-xs text-ink-muted">
              <th scope="col" className="px-4 py-3 text-start font-medium">
                {labels.asset}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {labels.price}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {labels.change24h}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {labels.marketCap}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-medium">
                {labels.volume24h}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((quote) => (
              <tr
                key={quote.slug}
                className="border-b border-border last:border-b-0 hover:bg-surface-raised"
              >
                <th scope="row" className="px-4 py-3 text-start font-normal">
                  <Link
                    href={`/${locale}/crypto/${quote.slug}`}
                    className="flex items-baseline gap-2 hover:underline"
                  >
                    <span className="font-latin font-semibold text-brand">
                      {quote.symbol}
                    </span>
                    <span className="font-latin text-xs text-ink-muted">
                      {quote.name}
                    </span>
                  </Link>
                </th>
                <td className="px-4 py-3 text-end font-latin tabular-nums">
                  {formatUsd(quote.priceUsd)}
                </td>
                <td
                  className={`px-4 py-3 text-end font-latin tabular-nums ${
                    quote.change24hPct === null
                      ? ""
                      : deltaClass(quote.change24hPct)
                  }`}
                >
                  {quote.change24hPct === null
                    ? "—"
                    : formatChange(quote.change24hPct)}
                </td>
                <td className="px-4 py-3 text-end font-latin tabular-nums">
                  {formatCompactUsd(quote.marketCapUsd)}
                </td>
                <td className="px-4 py-3 text-end font-latin tabular-nums">
                  {formatCompactUsd(quote.volume24hUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provenance: whose number this is and when they stamped it. */}
      <p className="mt-2 text-xs text-ink-muted">
        {labels.attribution}
        {quotedAt ? (
          <>
            {" · "}
            {labels.quotedAt}{" "}
            <time dateTime={quotedAt} className="font-latin">
              {new Date(quotedAt).toISOString().replace("T", " ").slice(0, 16)}{" "}
              UTC
            </time>
          </>
        ) : null}
      </p>
    </div>
  );
}
