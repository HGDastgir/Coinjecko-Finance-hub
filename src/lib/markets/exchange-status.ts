/**
 * Trading-session status computed from official regular local hours.
 *
 * Honesty constraints (mirrored in the UI):
 * - this is schedule-derived status, NOT live data
 * - public holidays and special sessions are not yet applied; the UI
 *   must display that caveat wherever this status appears
 *
 * Exchange reference data lives in src/lib/markets/reference-data.ts
 * (mirrored in supabase/seed.sql).
 */

import { EXCHANGES, type ExchangeInfo } from "./reference-data";

export interface ExchangeStatus {
  exchange: ExchangeInfo;
  isOpen: boolean;
  localTime: string; // "HH:MM"
  localDay: number; // ISO weekday
  sessionsLabel: string; // "09:30–16:00" (joined with ", ")
}

const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getExchangeStatus(
  exchange: ExchangeInfo,
  now: Date = new Date(),
): ExchangeStatus {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: exchange.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const localDay = WEEKDAY_TO_ISO[get("weekday")] ?? 0;
  // Some ICU versions render midnight as "24:xx" with hour12: false.
  const hour = get("hour") === "24" ? "00" : get("hour");
  const localTime = `${hour}:${get("minute")}`;
  const nowMinutes = minutesOf(localTime);

  const isTradingDay = exchange.tradingDays.includes(localDay);
  const inSession = exchange.sessions.some(
    (s) => nowMinutes >= minutesOf(s.open) && nowMinutes < minutesOf(s.close),
  );

  return {
    exchange,
    isOpen: isTradingDay && inSession,
    localTime,
    localDay,
    sessionsLabel: exchange.sessions
      .map((s) => `${s.open}–${s.close}`)
      .join(", "),
  };
}

/** Homepage strip: a cross-regional subset of major exchanges. */
const FEATURED_CODES = [
  "NYSE",
  "LSE",
  "PSX",
  "NSE",
  "TADAWUL",
  "DFM",
  "JPX",
  "HKEX",
];

export function getFeaturedExchangeStatuses(now?: Date): ExchangeStatus[] {
  return EXCHANGES.filter((e) => FEATURED_CODES.includes(e.code)).map((e) =>
    getExchangeStatus(e, now),
  );
}

export function getAllExchangeStatuses(now?: Date): ExchangeStatus[] {
  return EXCHANGES.map((e) => getExchangeStatus(e, now));
}
