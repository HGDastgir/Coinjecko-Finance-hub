import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import {
  getExchange,
  getHubBySlug,
  getHubForIndex,
  getHubIndices,
  getIndexBySlug,
  INDICES,
  MARKET_HUBS,
  type IndexInfo,
  type MarketHub,
} from "@/lib/markets/reference-data";
import { getExchangeStatus } from "@/lib/markets/exchange-status";
import {
  ExchangeStatusCard,
  tradingWeekLabel,
} from "@/components/markets/ExchangeStatusCard";

/**
 * /markets/[slug] — resolves either a regional hub (/markets/pakistan)
 * or an index page (/markets/kse-100). Slug allowlist only; unknown
 * slugs 404. Descriptive prose is English-authoritative (Urdu pages
 * carry the pending-translation notice, mirroring the legal pages).
 */

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = [
    ...MARKET_HUBS.map((h) => h.slug),
    ...INDICES.map((i) => i.slug),
  ];
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const hub = getHubBySlug(slug);
  if (hub) {
    return buildPageMetadata({
      locale: safeLocale,
      path: `/markets/${slug}`,
      title: `${safeLocale === "ur" ? hub.titleUr : hub.titleEn} — CoinJecko Finance Hub`,
      description: hub.introEn.split(". ").slice(0, 2).join(". "),
    });
  }
  const index = getIndexBySlug(slug);
  if (!index) return {};
  return buildPageMetadata({
    locale: safeLocale,
    path: `/markets/${slug}`,
    title: `${index.name} (${index.code}) — market hours, guide & context`,
    description: index.description,
  });
}

function englishProse(locale: Locale) {
  // Prose blocks are English until reviewed Urdu translations ship.
  return locale === "ur"
    ? { className: "font-latin", dir: "ltr" as const, lang: "en" }
    : { className: undefined, dir: undefined, lang: undefined };
}

function HubPage({
  hub,
  locale,
  dict,
}: {
  hub: MarketHub;
  locale: Locale;
  dict: Dictionary;
}) {
  const m = dict.markets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const title = locale === "ur" ? hub.titleUr : hub.titleEn;
  const prose = englishProse(locale);
  const indices = getHubIndices(hub);
  const statuses = hub.exchangeCodes
    .map((code) => getExchange(code))
    .filter((e) => e !== null)
    .map((e) => getExchangeStatus(e));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${locale}` },
              { name: m.title, url: `${base}/${locale}/markets` },
              { name: title, url: `${base}/${locale}/markets/${hub.slug}` },
            ]),
          ),
        }}
      />
      <nav className="text-sm" aria-label={dict.a11y.breadcrumbs}>
        <Link href={`/${locale}/markets`} className="text-brand hover:underline">
          {m.backToMap}
        </Link>
      </nav>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      {locale === "ur" && dict.legalNotice.urduPending ? (
        <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
          {dict.legalNotice.urduPending}
        </p>
      ) : null}
      <p
        className={`mt-3 max-w-3xl leading-relaxed text-ink-muted ${prose.className ?? ""}`}
        dir={prose.dir}
        lang={prose.lang}
      >
        {hub.introEn}
      </p>
      <p className="mt-3 text-xs text-ink-muted">{m.holidayCaveat}</p>

      <section aria-labelledby="hub-exchanges" className="mt-8">
        <h2 id="hub-exchanges" className="text-xl font-semibold">
          {m.exchangesTitle}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statuses.map((status) => (
            <ExchangeStatusCard
              key={status.exchange.code}
              status={status}
              dict={dict}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="hub-indices" className="mt-10">
        <h2 id="hub-indices" className="text-xl font-semibold">
          {m.relatedIndices}
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {indices.map((index) => (
            <li key={index.code}>
              <Link
                href={`/${locale}/markets/${index.slug}`}
                className="block h-full rounded-lg border border-border bg-surface p-5 hover:border-brand"
              >
                <span className="font-latin font-semibold text-brand">
                  {index.name}
                </span>
                <span
                  className="mt-2 block text-sm leading-relaxed text-ink-muted font-latin"
                  dir="ltr"
                  lang="en"
                >
                  {index.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function IndexPage({
  index,
  locale,
  dict,
}: {
  index: IndexInfo;
  locale: Locale;
  dict: Dictionary;
}) {
  const m = dict.markets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const prose = englishProse(locale);
  const exchange = getExchange(index.exchangeCode);
  const status = exchange ? getExchangeStatus(exchange) : null;
  const hub = getHubForIndex(index);
  const dayNames = m.dayNames as Record<string, string>;

  const faq = [
    exchange && {
      q: `When is the ${index.name} market open?`,
      a: `${exchange.name} trades ${status?.sessionsLabel} local time (${exchange.timezone}), ${tradingWeekLabel(exchange.tradingDays, dayNames)}. Regular hours only — public holidays are not reflected here.`,
    },
    {
      q: `What currency is the ${index.name} quoted in?`,
      a: `The ${index.name} is quoted in ${index.currency}.`,
    },
    {
      q: `What does the ${index.name} track?`,
      a: index.description,
    },
  ].filter((x): x is { q: string; a: string } => Boolean(x));

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${locale}` },
              { name: m.title, url: `${base}/${locale}/markets` },
              ...(hub
                ? [
                    {
                      name: locale === "ur" ? hub.titleUr : hub.titleEn,
                      url: `${base}/${locale}/markets/${hub.slug}`,
                    },
                  ]
                : []),
              {
                name: index.name,
                url: `${base}/${locale}/markets/${index.slug}`,
              },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />

      <nav className="text-sm" aria-label={dict.a11y.breadcrumbs}>
        <Link href={`/${locale}/markets`} className="text-brand hover:underline">
          {m.backToMap}
        </Link>
        {hub ? (
          <>
            <span className="mx-2 text-ink-muted" aria-hidden="true">
              /
            </span>
            <Link
              href={`/${locale}/markets/${hub.slug}`}
              className="text-brand hover:underline"
            >
              {locale === "ur" ? hub.titleUr : hub.titleEn}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-latin text-3xl font-bold">{index.name}</h1>
        <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-latin text-xs text-ink-muted">
          {index.code}
        </span>
        <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-latin text-xs text-ink-muted">
          {index.currency}
        </span>
      </div>

      {locale === "ur" && dict.legalNotice.urduPending ? (
        <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
          {dict.legalNotice.urduPending}
        </p>
      ) : null}

      {/* Session status */}
      {status ? (
        <div className="mt-6 max-w-sm">
          <ExchangeStatusCard status={status} dict={dict} />
          <p className="mt-2 text-xs text-ink-muted">{m.holidayCaveat}</p>
        </div>
      ) : null}

      {/* Market data — honest placeholder until a provider is live */}
      <section aria-labelledby="data-heading" className="mt-8">
        <h2 id="data-heading" className="text-xl font-semibold">
          {m.dataTitle}
        </h2>
        <div className="mt-3 rounded-lg border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
          <p>{dict.data.notConnected}</p>
          <p className="mt-2">{dict.data.notAdvice}</p>
        </div>
      </section>

      <section aria-labelledby="what-heading" className="mt-8">
        <h2 id="what-heading" className="text-xl font-semibold">
          {m.whatItIs}
        </h2>
        <p
          className={`mt-3 leading-relaxed text-ink-muted ${prose.className ?? ""}`}
          dir={prose.dir}
          lang={prose.lang}
        >
          {index.description}
        </p>
      </section>

      <section aria-labelledby="why-heading" className="mt-8">
        <h2 id="why-heading" className="text-xl font-semibold">
          {m.whyItMatters}
        </h2>
        <p
          className={`mt-3 leading-relaxed text-ink-muted ${prose.className ?? ""}`}
          dir={prose.dir}
          lang={prose.lang}
        >
          {index.whyItMatters}
        </p>
      </section>

      {/* Facts */}
      {exchange ? (
        <section aria-labelledby="facts-heading" className="mt-8">
          <h2 id="facts-heading" className="text-xl font-semibold">
            {m.exchange}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{m.exchange}</dt>
              <dd className="font-latin">{exchange.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{m.country}</dt>
              <dd className="font-latin">{exchange.country}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{m.timezone}</dt>
              <dd className="font-latin">{exchange.timezone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{m.marketHours}</dt>
              <dd className="font-latin tabular-nums">
                {status?.sessionsLabel}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{m.tradingWeek}</dt>
              <dd>{tradingWeekLabel(exchange.tradingDays, dayNames)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{m.currency}</dt>
              <dd className="font-latin">{index.currency}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {/* Historical chart — activates with a licensed provider */}
      <section aria-labelledby="chart-heading" className="mt-8">
        <h2 id="chart-heading" className="text-xl font-semibold">
          {m.chartTitle}
        </h2>
        <div className="mt-3 rounded-lg border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
          {m.chartComing}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mt-8">
        <h2 id="faq-heading" className="text-xl font-semibold">
          {m.faqTitle}
        </h2>
        <dl className="mt-3 space-y-4" dir="ltr" lang="en">
          {faq.map((item) => (
            <div
              key={item.q}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <dt className="font-latin font-medium">{item.q}</dt>
              <dd className="mt-2 font-latin text-sm leading-relaxed text-ink-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default async function MarketSlugPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const hub = getHubBySlug(slug);
  if (hub) return <HubPage hub={hub} locale={locale} dict={dict} />;

  const index = getIndexBySlug(slug);
  if (index) return <IndexPage index={index} locale={locale} dict={dict} />;

  notFound();
}
