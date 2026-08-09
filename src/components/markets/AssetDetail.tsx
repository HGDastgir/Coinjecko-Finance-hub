import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";

/**
 * Shared layout for asset detail pages (coins, forex pairs,
 * commodities): breadcrumbs, honest data placeholder, what/why
 * sections, chart placeholder and a fact-based FAQ with FAQPage
 * JSON-LD. Prose is English-authoritative; Urdu pages show the
 * pending-translation notice.
 */

export interface AssetFact {
  label: string;
  value: string;
}

export interface AssetFaqItem {
  q: string;
  a: string;
}

/**
 * A resolved quote, already formatted by the caller. This component
 * renders it and never derives one — the page that owns the provider
 * owns the formatting, so a price cannot be reformatted into something
 * the provider did not say.
 */
export interface AssetQuote {
  /** Formatted for display, e.g. "$4,343.30". */
  price: string;
  /** Formatted timestamp, or null when it could not be stated. */
  quotedAt: string | null;
  provider: string;
  providerUrl: string;
  isReference: boolean;
}

export function AssetDetail({
  locale,
  dict,
  sectionTitle,
  sectionPath,
  title,
  chips,
  description,
  whyItMatters,
  facts,
  faq,
  riskNote,
  quote,
}: {
  locale: Locale;
  dict: Dictionary;
  /** e.g. dict.assets.cryptoTitle */
  sectionTitle: string;
  /** e.g. "/crypto" */
  sectionPath: string;
  title: string;
  chips: string[];
  description: string;
  whyItMatters: string;
  facts: AssetFact[];
  faq: AssetFaqItem[];
  riskNote?: string;
  /** Omitted when no provider covers this asset. */
  quote?: AssetQuote | null;
}) {
  const m = dict.markets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const prose =
    locale === "ur"
      ? { className: "font-latin", dir: "ltr" as const, lang: "en" }
      : { className: "", dir: undefined, lang: undefined };

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
              { name: sectionTitle, url: `${base}/${locale}${sectionPath}` },
              { name: title, url: `${base}/${locale}${sectionPath}` },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />

      <nav className="text-sm" aria-label={dict.a11y.breadcrumbs}>
        <Link
          href={`/${locale}${sectionPath}`}
          className="text-brand hover:underline"
        >
          {sectionTitle}
        </Link>
      </nav>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-latin text-3xl font-bold">{title}</h1>
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-latin text-xs text-ink-muted"
          >
            {chip}
          </span>
        ))}
      </div>

      {locale === "ur" && dict.legalNotice.urduPending ? (
        <p className="mt-3 rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
          {dict.legalNotice.urduPending}
        </p>
      ) : null}

      {/* Live data. A real quote when a provider is connected for this
          asset; the honest placeholder when there is none. Never both,
          and never a number without its provider and timestamp. */}
      <section aria-labelledby="asset-data" className="mt-8">
        <h2 id="asset-data" className="text-xl font-semibold">
          {m.dataTitle}
        </h2>
        {quote ? (
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <p className="font-latin text-3xl font-bold tabular-nums">
              {quote.price}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              <a
                href={quote.providerUrl}
                rel="nofollow noopener noreferrer"
                target="_blank"
                className="font-latin hover:text-brand"
              >
                {quote.provider}
              </a>
              {quote.quotedAt ? (
                <>
                  {" · "}
                  {dict.data.quotedAt}{" "}
                  <span className="font-latin">{quote.quotedAt}</span>
                </>
              ) : null}
            </p>
            {quote.isReference ? (
              <p className="mt-1 text-xs text-ink-muted">
                {dict.data.referenceRate}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-ink-muted">{dict.data.notAdvice}</p>
            {riskNote ? (
              <p className="mt-2 text-sm text-ink-muted">{riskNote}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
            <p>{dict.data.notConnected}</p>
            <p className="mt-2">{dict.data.notAdvice}</p>
            {riskNote ? <p className="mt-2">{riskNote}</p> : null}
          </div>
        )}
      </section>

      <section aria-labelledby="asset-what" className="mt-8">
        <h2 id="asset-what" className="text-xl font-semibold">
          {m.whatItIs}
        </h2>
        <p
          className={`mt-3 leading-relaxed text-ink-muted ${prose.className}`}
          dir={prose.dir}
          lang={prose.lang}
        >
          {description}
        </p>
      </section>

      <section aria-labelledby="asset-why" className="mt-8">
        <h2 id="asset-why" className="text-xl font-semibold">
          {m.whyItMatters}
        </h2>
        <p
          className={`mt-3 leading-relaxed text-ink-muted ${prose.className}`}
          dir={prose.dir}
          lang={prose.lang}
        >
          {whyItMatters}
        </p>
      </section>

      {facts.length > 0 ? (
        <section aria-labelledby="asset-facts" className="mt-8">
          <h2 id="asset-facts" className="sr-only">
            {title}
          </h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-4">
                <dt className="text-ink-muted">{fact.label}</dt>
                <dd className="font-latin">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="asset-chart" className="mt-8">
        <h2 id="asset-chart" className="text-xl font-semibold">
          {m.chartTitle}
        </h2>
        <div className="mt-3 rounded-lg border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
          {m.chartComing}
        </div>
      </section>

      <section aria-labelledby="asset-faq" className="mt-8">
        <h2 id="asset-faq" className="text-xl font-semibold">
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
