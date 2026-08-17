import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { AdSlot } from "@/components/layout/AdSlot";
import { CRYPTO_ASSETS } from "@/lib/markets/asset-data";
import { CoinGeckoLink } from "@/components/markets/CoinGeckoLink";
import { CryptoMarketTable } from "@/components/markets/CryptoMarketTable";

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
    path: "/crypto",
    title: `${dict.assets.cryptoTitle} — ${dict.site.name}`,
    description: dict.assets.cryptoLead,
  });
}

export default async function CryptoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const a = dict.assets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: a.cryptoTitle, url: `${base}/${safeLocale}/crypto` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{a.cryptoTitle}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{a.cryptoLead}</p>
      <p className="mt-3 max-w-2xl rounded-md border border-accent/40 bg-surface p-3 text-sm text-ink-muted">
        {a.cryptoRisk}
      </p>
      <section aria-labelledby="market-heading" className="mt-6">
        <h2 id="market-heading" className="text-xl font-semibold">
          {dict.cryptoMarket.heading}
        </h2>
        <CryptoMarketTable locale={safeLocale} labels={dict.cryptoMarket} />
      </section>

      <section aria-labelledby="coins-heading" className="mt-10">
        <h2 id="coins-heading" className="text-2xl font-semibold">
          {a.coinsTitle}
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRYPTO_ASSETS.map((asset) => (
            <li key={asset.symbol}>
              {/* The two links are siblings, never nested: an anchor
                  inside an anchor is invalid and browsers resolve it
                  unpredictably. Our guide is the card; CoinGecko is a
                  separate, clearly labelled way out to live rates. */}
              <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors focus-within:border-brand hover:border-brand">
                <Link
                  href={`/${safeLocale}/crypto/${asset.slug}`}
                  className="block"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-latin font-semibold text-brand">
                      {asset.name}
                    </span>
                    <span className="font-latin text-xs text-ink-muted">
                      {asset.symbol}
                    </span>
                  </span>
                  <span
                    className="mt-2 block text-sm leading-relaxed text-ink-muted font-latin"
                    dir="ltr"
                    lang="en"
                  >
                    {asset.description}
                  </span>
                </Link>
                <CoinGeckoLink
                  slug={asset.slug}
                  label={dict.assets.liveOnCoinGecko}
                  className="mt-3"
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <AdSlot
        placement="section-footer"
        label={dict.ads.label}
        locale={safeLocale}
        path="/crypto"
      />

      <p className="mt-8 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
