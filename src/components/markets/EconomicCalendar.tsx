"use client";

import { useMemo, useState } from "react";

/**
 * Country + importance filters over the recurring-events guide, plus
 * the dated upcoming-events list when the database is connected.
 * All prose arrives pre-localised (or English-authoritative) from the
 * server component — this component only filters and renders.
 */

export interface CalendarLabels {
  filterCountry: string;
  filterImportance: string;
  allCountries: string;
  allLevels: string;
  publisher: string;
  cadence: string;
  noMatches: string;
  importanceHigh: string;
  importanceMedium: string;
  importanceLow: string;
  liveTitle: string;
  actual: string;
  forecast: string;
  previous: string;
}

export interface GuideItem {
  country: string;
  countryCode: string;
  title: string;
  publisher: string;
  /** Primary source. Null when no verified URL is held. */
  publisherUrl: string | null;
  cadence: string;
  importance: "high" | "medium" | "low";
  description: string;
}

export interface EventItem {
  id: string;
  country: string;
  title: string;
  importance: "high" | "medium" | "low";
  eventTime: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

const IMPORTANCE_STYLE: Record<GuideItem["importance"], string> = {
  high: "bg-down/10 text-down",
  medium: "bg-accent/10 text-accent",
  low: "bg-surface-raised text-ink-muted",
};

function ImportanceBadge({
  level,
  labels,
}: {
  level: GuideItem["importance"];
  labels: CalendarLabels;
}) {
  const text =
    level === "high"
      ? labels.importanceHigh
      : level === "medium"
        ? labels.importanceMedium
        : labels.importanceLow;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${IMPORTANCE_STYLE[level]}`}
    >
      {text}
    </span>
  );
}

export function EconomicCalendar({
  guide,
  events,
  countries,
  labels,
  locale,
}: {
  guide: GuideItem[];
  events: EventItem[] | null;
  countries: { code: string; name: string }[];
  labels: CalendarLabels;
  locale: string;
}) {
  const [country, setCountry] = useState("all");
  const [importance, setImportance] = useState("all");

  const filteredGuide = useMemo(
    () =>
      guide.filter(
        (item) =>
          (country === "all" || item.countryCode === country) &&
          (importance === "all" || item.importance === importance),
      ),
    [guide, country, importance],
  );

  const filteredEvents = useMemo(
    () =>
      (events ?? []).filter(
        (item) =>
          (country === "all" ||
            countries.find((c) => c.code === country)?.name === item.country) &&
          (importance === "all" || item.importance === importance),
      ),
    [events, countries, country, importance],
  );

  const dateFormat = new Intl.DateTimeFormat(
    locale === "ur" ? "ur-PK" : "en-GB",
    { dateStyle: "medium", timeStyle: "short" },
  );

  const selectClass =
    "rounded-md border border-border bg-surface px-3 py-2 text-sm";

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label
            htmlFor="cal-country"
            className="mb-1 block text-sm font-medium"
          >
            {labels.filterCountry}
          </label>
          <select
            id="cal-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={selectClass}
          >
            <option value="all">{labels.allCountries}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="cal-importance"
            className="mb-1 block text-sm font-medium"
          >
            {labels.filterImportance}
          </label>
          <select
            id="cal-importance"
            value={importance}
            onChange={(e) => setImportance(e.target.value)}
            className={selectClass}
          >
            <option value="all">{labels.allLevels}</option>
            <option value="high">{labels.importanceHigh}</option>
            <option value="medium">{labels.importanceMedium}</option>
            <option value="low">{labels.importanceLow}</option>
          </select>
        </div>
      </div>

      {/* Dated events (only when the database feed is live) */}
      {events && events.length > 0 ? (
        <section aria-label={labels.liveTitle} className="mt-6">
          <ul className="space-y-3">
            {filteredEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-latin text-sm font-semibold">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {event.country} ·{" "}
                      <time dateTime={event.eventTime} className="font-latin">
                        {dateFormat.format(new Date(event.eventTime))}
                      </time>
                    </p>
                  </div>
                  <ImportanceBadge level={event.importance} labels={labels} />
                </div>
                {(event.actual ?? event.forecast ?? event.previous) ? (
                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
                    {event.actual ? (
                      <div className="flex gap-1">
                        <dt>{labels.actual}:</dt>
                        <dd className="font-latin">{event.actual}</dd>
                      </div>
                    ) : null}
                    {event.forecast ? (
                      <div className="flex gap-1">
                        <dt>{labels.forecast}:</dt>
                        <dd className="font-latin">{event.forecast}</dd>
                      </div>
                    ) : null}
                    {event.previous ? (
                      <div className="flex gap-1">
                        <dt>{labels.previous}:</dt>
                        <dd className="font-latin">{event.previous}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </li>
            ))}
            {filteredEvents.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border p-4 text-sm text-ink-muted">
                {labels.noMatches}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* Recurring-events guide (English-authoritative prose) */}
      <ul className="mt-6 space-y-3">
        {filteredGuide.map((item) => (
          <li
            key={`${item.countryCode}-${item.title}`}
            className="rounded-lg border border-border bg-surface p-4"
            dir="ltr"
            lang="en"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-latin text-sm font-semibold">
                {item.title}
                <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                  {item.country}
                </span>
              </p>
              <ImportanceBadge level={item.importance} labels={labels} />
            </div>
            <p className="mt-2 font-latin text-sm leading-relaxed text-ink-muted">
              {item.description}
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-latin text-xs text-ink-muted">
              <div className="flex gap-1">
                <dt>{labels.publisher}:</dt>
                <dd>
                  {/* Links out to the primary source. nofollow +
                      noreferrer: these are citations, not endorsements,
                      and the destination has no need for our URL. */}
                  {item.publisherUrl ? (
                    <a
                      href={item.publisherUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="underline decoration-dotted underline-offset-2 hover:text-brand"
                    >
                      {item.publisher} ↗
                    </a>
                  ) : (
                    item.publisher
                  )}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt>{labels.cadence}:</dt>
                <dd>{item.cadence}</dd>
              </div>
            </dl>
          </li>
        ))}
        {filteredGuide.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-4 text-sm text-ink-muted">
            {labels.noMatches}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
