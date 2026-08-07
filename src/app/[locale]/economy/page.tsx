import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import {
  CALENDAR_COUNTRIES,
  getUpcomingEvents,
  RECURRING_EVENTS,
} from "@/lib/markets/economic-events";
import { EconomicCalendar } from "@/components/markets/EconomicCalendar";

/** Refresh dated events every 5 minutes once the feed is live. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  return buildPageMetadata({
    locale: safeLocale,
    path: "/economy",
    title: `${dict.economy.title} — ${dict.site.name}`,
    description: dict.economy.lead,
  });
}

export default async function EconomyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const e = dict.economy;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const events = await getUpcomingEvents();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: e.title, url: `${base}/${safeLocale}/economy` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{e.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{e.lead}</p>

      {/* Live-feed gate: shown until the events backend is connected */}
      {!events || events.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          {e.liveGate}
        </div>
      ) : null}

      {/* Importance legend */}
      <section aria-labelledby="importance-heading" className="mt-8">
        <h2 id="importance-heading" className="text-xl font-semibold">
          {e.importanceTitle}
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <dt className="text-sm font-semibold text-down">
              {e.importanceHigh}
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">
              {e.importanceHighDesc}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <dt className="text-sm font-semibold text-accent">
              {e.importanceMedium}
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">
              {e.importanceMediumDesc}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <dt className="text-sm font-semibold">{e.importanceLow}</dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-muted">
              {e.importanceLowDesc}
            </dd>
          </div>
        </dl>
      </section>

      {/* Guide + filters (+ dated events when live) */}
      <section aria-labelledby="guide-heading" className="mt-10">
        <h2 id="guide-heading" className="text-2xl font-semibold">
          {e.guideTitle}
        </h2>
        <p className="mt-1 mb-5 text-sm text-ink-muted">{e.guideLead}</p>
        <EconomicCalendar
          guide={RECURRING_EVENTS}
          events={events}
          countries={CALENDAR_COUNTRIES.map((c) => ({
            code: c.code,
            name: c.nameEn,
          }))}
          labels={{
            filterCountry: e.filterCountry,
            filterImportance: e.filterImportance,
            allCountries: e.allCountries,
            allLevels: e.allLevels,
            publisher: e.publisher,
            cadence: e.cadence,
            noMatches: e.noMatches,
            importanceHigh: e.importanceHigh,
            importanceMedium: e.importanceMedium,
            importanceLow: e.importanceLow,
            liveTitle: e.liveTitle,
            actual: e.actual,
            forecast: e.forecast,
            previous: e.previous,
          }}
          locale={safeLocale}
        />
      </section>

      <p className="mt-8 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
