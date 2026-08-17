import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { AdSlot } from "@/components/layout/AdSlot";
import {
  FOREX_PAIRS,
  type ForexPairInfo,
} from "@/lib/markets/asset-data";
import { CurrencyConverter } from "@/components/markets/CurrencyConverter";
import { CONVERTER_CURRENCIES } from "@/lib/markets/fx-rates";

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
    path: "/forex",
    title: `${dict.assets.forexTitle} — ${dict.site.name}`,
    description: dict.assets.forexLead,
  });
}

function PairList({
  pairs,
  locale,
}: {
  pairs: ForexPairInfo[];
  locale: Locale;
}) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {pairs.map((pair) => (
        <li key={pair.slug}>
          <Link
            href={`/${locale}/forex/${pair.slug}`}
            className="block h-full rounded-lg border border-border bg-surface p-5 hover:border-brand"
          >
            <span className="font-latin font-semibold text-brand">
              {pair.base}/{pair.quote}
            </span>
            <span
              className="mt-2 block text-sm leading-relaxed text-ink-muted font-latin"
              dir="ltr"
              lang="en"
            >
              {pair.description}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ForexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const a = dict.assets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const corridors = FOREX_PAIRS.filter((p) => p.group === "pkr_corridor");
  const majors = FOREX_PAIRS.filter((p) => p.group === "major");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: a.forexTitle, url: `${base}/${safeLocale}/forex` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{a.forexTitle}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{a.forexLead}</p>

      <section aria-labelledby="converter-heading" className="mt-8 max-w-2xl">
        <h2 id="converter-heading" className="text-2xl font-semibold">
          {a.converterTitle}
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-muted">{a.converterLead}</p>
        <CurrencyConverter
          currencies={CONVERTER_CURRENCIES}
          labels={{
            amount: a.amount,
            from: a.from,
            to: a.to,
            convert: a.convert,
            unavailable: a.converterUnavailable,
            rateNote: a.rateNote,
          }}
        />
      </section>

      <section aria-labelledby="corridors-heading" className="mt-10">
        <h2 id="corridors-heading" className="text-2xl font-semibold">
          {a.pkrCorridors}
        </h2>
        <PairList pairs={corridors} locale={safeLocale} />
      </section>

      <section aria-labelledby="majors-heading" className="mt-10">
        <h2 id="majors-heading" className="text-2xl font-semibold">
          {a.majors}
        </h2>
        <PairList pairs={majors} locale={safeLocale} />
      </section>

      <AdSlot
        placement="section-footer"
        label={dict.ads.label}
        locale={safeLocale}
        path="/forex"
      />

      <p className="mt-8 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
