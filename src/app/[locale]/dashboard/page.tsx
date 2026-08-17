import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { AdSlot } from "@/components/layout/AdSlot";
import { getFeaturedExchangeStatuses } from "@/lib/markets/exchange-status";
import { GlobalCryptoStats } from "@/components/markets/GlobalCryptoStats";
import { TopMovers } from "@/components/markets/TopMovers";
import { CryptoMarketTable } from "@/components/markets/CryptoMarketTable";

/**
 * Market dashboard: aggregates, movers, the coin table and world
 * exchange sessions on one screen.
 *
 * Every figure is live provider data or schedule-derived status —
 * there are no sample widgets. Panels that cannot be filled render
 * their own disconnected state rather than a placeholder number.
 */

/** Exchange session status is schedule-derived; recompute every 5 min. */
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
    path: "/dashboard",
    title: `${dict.dashboard.title} — ${dict.site.name}`,
    description: dict.dashboard.lead,
  });
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const d = dict.dashboard;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const statuses = getFeaturedExchangeStatuses();

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: d.title, url: `${base}/${safeLocale}/dashboard` },
            ]),
          ),
        }}
      />

      <div className="bg-hero border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">{d.title}</h1>
              <p className="mt-2 max-w-2xl text-ink-muted">{d.lead}</p>
            </div>
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-full bg-up"
              />
              {d.updated}
            </p>
          </div>
          <div className="mt-8">
            <GlobalCryptoStats labels={dict.globalStats} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <section aria-labelledby="movers-heading">
          <h2 id="movers-heading" className="text-xl font-semibold">
            {d.moversTitle}
          </h2>
          <div className="mt-4">
            <TopMovers locale={safeLocale} labels={d} />
          </div>
        </section>

        <section aria-labelledby="market-heading">
          <h2 id="market-heading" className="text-xl font-semibold">
            {d.marketTitle}
          </h2>
          <CryptoMarketTable locale={safeLocale} labels={dict.cryptoMarket} />
        </section>

        <section aria-labelledby="sessions-heading">
          <h2 id="sessions-heading" className="text-xl font-semibold">
            {d.sessionsTitle}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statuses.map(({ exchange, isOpen, localTime, sessionsLabel }) => (
              <li
                key={exchange.code}
                className="rounded-lg border border-border bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-latin text-sm font-semibold">
                    {exchange.name}
                  </h3>
                  <span
                    className={
                      isOpen
                        ? "shrink-0 rounded-full bg-up/10 px-2 py-0.5 text-xs font-medium text-up"
                        : "shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink-muted"
                    }
                  >
                    {isOpen ? `● ${dict.markets.open}` : `○ ${dict.markets.closed}`}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-xs text-ink-muted">
                  <div className="flex justify-between gap-2">
                    <dt>{dict.home.localTime}</dt>
                    <dd className="font-latin tabular-nums">{localTime}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>{dict.home.tradingHours}</dt>
                    <dd className="font-latin">{sessionsLabel}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            {dict.markets.holidayCaveat}
          </p>
        </section>

        <AdSlot
          placement="section-footer"
          label={dict.ads.label}
          locale={safeLocale}
          path="/dashboard"
        />

        <p className="text-xs text-ink-muted">{dict.data.notAdvice}</p>
      </div>
    </div>
  );
}
