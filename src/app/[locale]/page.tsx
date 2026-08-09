import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getFeaturedExchangeStatuses } from "@/lib/markets/exchange-status";
import { GlobalCryptoStats } from "@/components/markets/GlobalCryptoStats";
import { AdSlot } from "@/components/layout/AdSlot";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** Recompute exchange session status every 5 minutes. */
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
    path: "/",
    title: `${dict.site.name} — ${dict.site.tagline}`,
    description: dict.site.description,
  });
}

const SERIES_KEYS = [
  "globalMarketPulse",
  "pakistanRupeeWatch",
  "exchangeOpeningBell",
  "cryptoContextReport",
  "marketCloseExplained",
  "worldMarketMap",
] as const satisfies readonly (keyof Dictionary["series"])[];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const statuses = getFeaturedExchangeStatuses();

  return (
    <div>
      {/* Hero band — full-bleed gradient, centred, with the live
          global market stats sitting directly underneath it. */}
      <section className="bg-hero border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="mx-auto w-fit rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-ink-muted">
            {dict.site.shortName} — English &amp; اردو
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-center text-4xl font-bold leading-tight sm:text-6xl sm:leading-tight">
            {dict.home.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-relaxed text-ink-muted">
            {dict.home.heroLead}
          </p>
          <div className="mt-10">
            <GlobalCryptoStats labels={dict.globalStats} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">

      <AdSlot placement="top-leaderboard" label={dict.ads.label} />

      {/* World exchange status */}
      <section aria-labelledby="exchange-status-heading" className="py-8">
        <h2 id="exchange-status-heading" className="text-2xl font-semibold">
          {dict.home.exchangeStatusTitle}
        </h2>
        <p className="mt-1 text-ink-muted">{dict.home.exchangeStatusLead}</p>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statuses.map(({ exchange, isOpen, localTime, sessionsLabel }) => (
            <li
              key={exchange.code}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-latin text-sm font-semibold">
                  {exchange.name}
                </h3>
                <span
                  className={
                    isOpen
                      ? "shrink-0 rounded-full bg-up/10 px-2 py-0.5 text-xs font-medium text-up"
                      : "shrink-0 rounded-full bg-down/10 px-2 py-0.5 text-xs font-medium text-down"
                  }
                >
                  {isOpen ? `● ${dict.home.open}` : `○ ${dict.home.closed}`}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-ink-muted">
                <div className="flex justify-between gap-2">
                  <dt>{dict.home.localTime}</dt>
                  <dd className="font-latin tabular-nums">{localTime}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{dict.home.tradingHours}</dt>
                  <dd className="font-latin tabular-nums">{sessionsLabel}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">
          {dict.home.exchangeStatusNote}
        </p>
        <Link
          href={`/${safeLocale}/markets`}
          className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:bg-brand-strong"
        >
          {dict.nav.worldMarketMap} →
        </Link>
      </section>

      {/* Editorial series */}
      <section aria-labelledby="series-heading" className="py-8">
        <h2 id="series-heading" className="text-2xl font-semibold">
          {dict.home.seriesTitle}
        </h2>
        <p className="mt-1 text-ink-muted">{dict.home.seriesLead}</p>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERIES_KEYS.map((key) => (
            <li
              key={key}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <h3 className="font-semibold text-brand">
                {dict.series[key].title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {dict.series[key].description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <AdSlot placement="in-feed" label={dict.ads.label} />

      {/* Newsroom */}
      <section aria-labelledby="newsroom-heading" className="py-8">
        <h2 id="newsroom-heading" className="text-2xl font-semibold">
          {dict.home.newsroomTitle}
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-muted">
          {dict.home.newsroomComing}
        </p>
        <p className="mt-4 text-xs text-ink-muted">{dict.data.notAdvice}</p>
      </section>
      </div>
    </div>
  );
}
