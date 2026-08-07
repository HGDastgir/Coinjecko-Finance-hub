"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { Sparkline } from "@/components/markets/Sparkline";
import {
  deltaClass,
  formatChange,
  formatCompactUsd,
  formatUsd,
  useCryptoMarkets,
} from "@/components/markets/useCryptoMarkets";

/**
 * Live crypto market table: logo, name, price, 24h change, market cap,
 * 24h volume and a 7-day sparkline, with search and a movement filter.
 *
 * Wide content scrolls inside its own container so the page body never
 * scrolls sideways on a phone. Figures are tabular-nums and font-latin
 * so Latin digits keep their shape inside Urdu text.
 */

export interface MarketTableLabels {
  heading: string;
  asset: string;
  price: string;
  change24h: string;
  marketCap: string;
  volume24h: string;
  chart7d: string;
  search: string;
  searchPlaceholder: string;
  filterAll: string;
  filterGainers: string;
  filterLosers: string;
  noMatches: string;
  unavailable: string;
  quotedAt: string;
  attribution: string;
}

type Movement = "all" | "gainers" | "losers";

export function CryptoMarketTable({
  locale,
  labels,
}: {
  locale: Locale;
  labels: MarketTableLabels;
}) {
  const data = useCryptoMarkets();
  const [query, setQuery] = useState("");
  const [movement, setMovement] = useState<Movement>("all");

  const ranked = useMemo(() => {
    const quotes = data?.quotes ?? [];
    const needle = query.trim().toLowerCase();
    return [...quotes]
      .filter((q) => {
        if (
          needle &&
          !q.name.toLowerCase().includes(needle) &&
          !q.symbol.toLowerCase().includes(needle)
        ) {
          return false;
        }
        if (movement === "gainers") return (q.change24hPct ?? 0) > 0;
        if (movement === "losers") return (q.change24hPct ?? 0) < 0;
        return true;
      })
      .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
  }, [data, query, movement]);

  if (!data || data.quotes.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
        {labels.unavailable}
      </div>
    );
  }

  const quotedAt = data.quotes[0]?.quotedAt;

  const filters: { key: Movement; label: string }[] = [
    { key: "all", label: labels.filterAll },
    { key: "gainers", label: labels.filterGainers },
    { key: "losers", label: labels.filterLosers },
  ];

  return (
    <div className="mt-4">
      {/* Controls stack on phones, sit inline from sm up. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-xs sm:flex-1">
          <label htmlFor="coin-search" className="sr-only">
            {labels.search}
          </label>
          <input
            id="coin-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1" role="group" aria-label={labels.search}>
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMovement(key)}
              aria-pressed={movement === key}
              // min-h-11 keeps the tap target at the 44px floor; most
              // of this audience is on a phone.
              className={`min-h-11 flex-1 rounded-md border px-3 text-xs font-medium transition-colors sm:flex-none ${
                movement === key
                  ? "border-brand bg-brand text-brand-contrast"
                  : "border-border hover:bg-surface-raised"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          {labels.noMatches}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[44rem] border-collapse bg-surface text-sm">
            <caption className="sr-only">{labels.heading}</caption>
            <thead>
              <tr className="border-b border-border text-xs text-ink-muted">
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
                <th scope="col" className="px-4 py-3 text-end font-medium">
                  {labels.chart7d}
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
                      className="flex items-center gap-3 hover:underline"
                    >
                      {quote.logoUrl ? (
                        <Image
                          src={quote.logoUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="shrink-0 rounded-full"
                          unoptimized
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="size-6 shrink-0 rounded-full bg-surface-raised"
                        />
                      )}
                      <span className="flex flex-col leading-tight">
                        <span className="font-latin font-semibold text-brand">
                          {quote.symbol}
                        </span>
                        <span className="font-latin text-xs text-ink-muted">
                          {quote.name}
                        </span>
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
                  <td className="px-4 py-3">
                    <span className="flex justify-end">
                      <Sparkline series={quote.sparkline7d} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
