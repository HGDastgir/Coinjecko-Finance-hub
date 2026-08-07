"use client";

import {
  deltaClass,
  formatChange,
  formatCompactUsd,
  useCryptoMarkets,
} from "@/components/markets/useCryptoMarkets";

/**
 * Aggregate crypto market stats: total market cap, 24h volume and
 * BTC/ETH dominance.
 *
 * Every figure is real CoinGecko `/global` data. When the aggregate
 * endpoint is unavailable the row is omitted entirely rather than
 * showing zeroes or placeholders.
 */

export interface GlobalStatsLabels {
  heading: string;
  totalMarketCap: string;
  volume24h: string;
  btcDominance: string;
  ethDominance: string;
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 font-latin text-2xl font-bold tabular-nums">
        {value}
      </dd>
      {sub ? <dd className="mt-0.5 text-xs">{sub}</dd> : null}
    </div>
  );
}

export function GlobalCryptoStats({ labels }: { labels: GlobalStatsLabels }) {
  const data = useCryptoMarkets();
  const global = data?.global;

  if (!global) return null;

  return (
    <section aria-labelledby="global-stats-heading">
      <h2 id="global-stats-heading" className="sr-only">
        {labels.heading}
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label={labels.totalMarketCap}
          value={formatCompactUsd(global.totalMarketCapUsd)}
          sub={
            global.marketCapChange24hPct === null ? null : (
              <span
                className={`font-latin tabular-nums ${deltaClass(global.marketCapChange24hPct)}`}
              >
                {formatChange(global.marketCapChange24hPct)}
              </span>
            )
          }
        />
        <Tile
          label={labels.volume24h}
          value={formatCompactUsd(global.totalVolume24hUsd)}
        />
        <Tile
          label={labels.btcDominance}
          value={
            global.btcDominancePct === null
              ? "—"
              : `${global.btcDominancePct.toFixed(1)}%`
          }
        />
        <Tile
          label={labels.ethDominance}
          value={
            global.ethDominancePct === null
              ? "—"
              : `${global.ethDominancePct.toFixed(1)}%`
          }
        />
      </dl>
    </section>
  );
}
