import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import {
  INDICES,
  MARKET_HUBS,
  type Region,
} from "@/lib/markets/reference-data";
import { getAllExchangeStatuses } from "@/lib/markets/exchange-status";
import { ExchangeStatusCard } from "@/components/markets/ExchangeStatusCard";

/**
 * World Market Map — the flagship dashboard. Session status is
 * schedule-derived (holiday caveat shown); prices join from licensed
 * providers in a later phase, never fabricated.
 */

export const revalidate = 300;

const REGION_ORDER: Region[] = [
  "south_asia",
  "middle_east",
  "asia_pacific",
  "europe",
  "north_america",
];

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
    path: "/markets",
    title: `${dict.markets.title} — ${dict.site.name}`,
    description: dict.markets.lead,
  });
}

export default async function MarketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const m = dict.markets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const statuses = getAllExchangeStatuses();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: m.title, url: `${base}/${safeLocale}/markets` },
            ]),
          ),
        }}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">{m.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{m.lead}</p>
      <p className="mt-3 text-xs text-ink-muted">{m.holidayCaveat}</p>

      {/* Exchanges grouped by region */}
      {REGION_ORDER.map((region) => {
        const regional = statuses.filter(
          (s) => s.exchange.region === region,
        );
        if (regional.length === 0) return null;
        return (
          <section
            key={region}
            aria-labelledby={`region-${region}`}
            className="mt-10"
          >
            <h2 id={`region-${region}`} className="text-xl font-semibold">
              {m.regionLabels[region]}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {regional.map((status) => (
                <ExchangeStatusCard
                  key={status.exchange.code}
                  status={status}
                  dict={dict}
                  locale={safeLocale}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Regional hubs */}
      <section aria-labelledby="hubs-heading" className="mt-12">
        <h2 id="hubs-heading" className="text-2xl font-semibold">
          {m.regionsTitle}
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MARKET_HUBS.map((hub) => (
            <li key={hub.slug}>
              <Link
                href={`/${safeLocale}/markets/${hub.slug}`}
                className="block h-full rounded-lg border border-border bg-surface p-5 hover:border-brand"
              >
                <span className="font-semibold text-brand">
                  {safeLocale === "ur" ? hub.titleUr : hub.titleEn}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-ink-muted font-latin" dir="ltr" lang="en">
                  {hub.introEn.split(". ")[0]}.
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Major indices */}
      <section aria-labelledby="indices-heading" className="mt-12">
        <h2 id="indices-heading" className="text-2xl font-semibold">
          {m.indicesTitle}
        </h2>
        {REGION_ORDER.map((region) => {
          const regional = INDICES.filter((i) => i.region === region);
          if (regional.length === 0) return null;
          return (
            <div key={region} className="mt-5">
              <h3 className="text-sm font-semibold text-ink-muted">
                {m.regionLabels[region]}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {regional.map((index) => (
                  <li key={index.code}>
                    <Link
                      href={`/${safeLocale}/markets/${index.slug}`}
                      className="block rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-latin hover:border-brand hover:text-brand"
                    >
                      {index.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
