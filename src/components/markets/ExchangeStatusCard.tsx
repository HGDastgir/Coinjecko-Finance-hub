import Link from "next/link";
import type { ExchangeStatus } from "@/lib/markets/exchange-status";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { primaryIndexForExchange } from "@/lib/markets/reference-data";

export function tradingWeekLabel(
  tradingDays: number[],
  dayNames: Record<string, string>,
): string {
  if (tradingDays.length === 0) return "—";
  const first = dayNames[String(tradingDays[0])] ?? "";
  const last = dayNames[String(tradingDays[tradingDays.length - 1])] ?? "";
  return `${first}–${last}`;
}

/**
 * Exchange session card. Status is schedule-derived — the page that
 * renders these must also render dict.markets.holidayCaveat nearby.
 * Movement/status is never colour-only (● / ○ + text label).
 */
export function ExchangeStatusCard({
  status,
  dict,
  locale,
}: {
  status: ExchangeStatus;
  dict: Dictionary;
  /** Omit to render a non-interactive card (e.g. the dashboard grid). */
  locale?: Locale;
}) {
  const { exchange, isOpen, localTime, sessionsLabel } = status;
  const m = dict.markets;

  // Exchanges have no page of their own, so the card points at the
  // index that represents that market. Without one there is nowhere
  // honest to send the reader, so the card stays static rather than
  // looking clickable and doing nothing.
  const index = locale ? primaryIndexForExchange(exchange.code) : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-latin text-sm font-semibold">
          {exchange.name}
          <span className="mt-0.5 block text-xs font-normal text-ink-muted">
            {exchange.city}, {exchange.country}
          </span>
        </h3>
        <span
          className={
            isOpen
              ? "shrink-0 rounded-full bg-up/10 px-2 py-0.5 text-xs font-medium text-up"
              : "shrink-0 rounded-full bg-down/10 px-2 py-0.5 text-xs font-medium text-down"
          }
        >
          {isOpen ? `● ${m.open}` : `○ ${m.closed}`}
        </span>
      </div>
      <dl className="mt-3 space-y-1 text-xs text-ink-muted">
        <div className="flex justify-between gap-2">
          <dt>{m.localTime}</dt>
          <dd className="font-latin tabular-nums">{localTime}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{m.marketHours}</dt>
          <dd className="font-latin tabular-nums">{sessionsLabel}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{m.tradingWeek}</dt>
          <dd>
            {tradingWeekLabel(
              exchange.tradingDays,
              m.dayNames as Record<string, string>,
            )}
          </dd>
        </div>
      </dl>
    </>
  );

  if (!index) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/${locale}/markets/${index.slug}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand"
    >
      {body}
      <span className="mt-3 block text-xs font-medium text-brand">
        {index.name} →
      </span>
    </Link>
  );
}
